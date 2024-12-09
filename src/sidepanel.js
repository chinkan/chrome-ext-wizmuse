import "./sidepanel.css";
import { getStorageData, setStorageData } from "./utils/storage.js";
import EasyMDE from "easymde";

const NOTION_CONFIG = {
  API_URL: "https://api.notion.com/v1",
  API_VERSION: "2022-02-22",
};

class NotesManager {
  constructor() {
    this.viewMode = "list";
    this.notes = [];
    this.setupElements();
    this.setupEventListeners();
    this.loadNotes();
    this.initializeSync();
  }

  setupElements() {
    this.loadIndicator = document.getElementById("loading-indicator");
    this.errorMessage = document.getElementById("error-message");
    this.lastSyncElement = document.getElementById("last-sync");
    this.syncButton = document.getElementById("sync-now");
  }

  setupEventListeners() {
    // View mode toggles
    document
      .getElementById("list-view")
      .addEventListener("click", () => this.setViewMode("list"));
    document
      .getElementById("grid-view")
      .addEventListener("click", () => this.setViewMode("grid"));

    // Search functionality
    document
      .getElementById("search-input")
      .addEventListener("input", (e) => this.handleSearch(e.target.value));

    // New note button
    document
      .getElementById("new-note")
      .addEventListener("click", () => this.createNewNote());

    // Options button
    document.getElementById("open-options").addEventListener("click", () => {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL("options.html"));
      }
    });

    // Sync button
    this.syncButton?.addEventListener("click", () => this.syncToNotion());

    // Auto-sync setup
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes.notes) {
        this.scheduleSync();
      }
    });
  }

  async loadNotes() {
    try {
      const result = await getStorageData(["notes"]);
      this.notes = result.notes || [];
      this.renderNotes();
      this.updateNotesCount();
    } catch (error) {
      console.error("Error loading notes:", error);
    }
  }

  setViewMode(mode) {
    this.viewMode = mode;
    const container = document.getElementById("notes-container");
    container.className = `notes-container ${mode}-view`;

    // Update active state of view buttons
    document
      .getElementById("list-view")
      .classList.toggle("active", mode === "list");
    document
      .getElementById("grid-view")
      .classList.toggle("active", mode === "grid");
  }

  handleSearch(query) {
    const filteredNotes = this.notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.excerpt.toLowerCase().includes(query.toLowerCase()) ||
        note.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
    );
    this.renderNotes(filteredNotes);
  }

  async summarizeWebsite(url, title) {
    try {
      // Get the current domain settings
      const currentDomain = new URL(url).hostname;
      const result = await getStorageData([`domainSettings.${currentDomain}`]);
      const domainSettings = result[`domainSettings.${currentDomain}`] || {};

      // Get the page content through content script
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const contentResponse = await chrome.tabs.sendMessage(tab.id, {
        action: "getPageContent",
      });

      if (!contentResponse || !contentResponse.content) {
        throw new Error("Failed to get page content");
      }

      const response = await chrome.runtime.sendMessage({
        action: "summarize",
        text: contentResponse.content,
        selectedIndex: domainSettings.selectedModelIndex,
        selectPromptIndex: domainSettings.selectPromptIndex,
      });

      if (response && response.error) {
        throw new Error(response.error);
      }

      if (response && response.summary) {
        // Save to history
        const key = `histories.${url}`;
        await setStorageData({
          [key]: {
            summary: response.summary,
            title: title,
            timestamp: Date.now(),
            promptName: response.promptName,
            providerName: response.providerName,
          },
        });
        return response.summary;
      }

      throw new Error("Invalid summary response");
    } catch (error) {
      console.error("Error summarizing website:", error);
      throw error;
    }
  }

  async getPageContent(tab) {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "getPageContent",
      });
      return response.content;
    } catch (error) {
      console.error("Error getting page content:", error);
      throw error;
    }
  }

  async createNewNote() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Show loading state
      const newNoteButton = document.getElementById("new-note");
      const originalIcon = newNoteButton.innerHTML;
      newNoteButton.innerHTML = '<i class="material-icons rotating">sync</i>';
      this.loadIndicator.style.display = "flex";
      this.errorMessage.style.display = "none";

      // Get summary
      let summary;
      try {
        summary = await this.summarizeWebsite(tab.url, tab.title);
      } catch (error) {
        console.error("Error getting summary:", error);
        summary = "Failed to generate summary. Click to add content...";
      }

      const newNote = {
        id: Date.now(),
        title: tab.title || "New Note",
        date: new Date().toISOString().split("T")[0],
        tags: [],
        source: new URL(tab.url).hostname,
        excerpt: summary,
        content: summary,
        url: tab.url,
        timestamp: Date.now(),
      };

      this.notes.unshift(newNote);
      await this.saveNotes();
      this.renderNotes();
      this.updateNotesCount();

      // Restore button state
      newNoteButton.innerHTML = originalIcon;
    } catch (error) {
      console.error("Error creating new note:", error);
      // Restore button state on error
      const newNoteButton = document.getElementById("new-note");
      newNoteButton.innerHTML = '<i class="material-icons">add</i>';
    }
    finally {
      this.loadIndicator.style.display = "none";
    }
  }

  async saveNotes() {
    try {
      await setStorageData({ notes: this.notes });
      this.updateLastSync();
    } catch (error) {
      console.error("Error saving notes:", error);
    }
  }

  renderNotes(notesToRender = this.notes) {
    const container = document.getElementById("notes-container");
    container.innerHTML = "";
    const template = document.getElementById("note-template");

    notesToRender.forEach((note) => {
      const noteElement = template.content
        .cloneNode(true)
        .querySelector(".note-item");
      const plainText = note.content.replace(/[#*`_~\[\]]/g, ""); // Remove markdown syntax
      const preview =
        plainText.substring(0, 100) + (plainText.length > 100 ? "..." : "");

      noteElement.querySelector(".note-title").textContent =
        note.title || "Untitled";
      noteElement.querySelector(".note-content").textContent = preview;
      noteElement.setAttribute("data-note-id", note.id);

      // Add click event for showing detail view
      noteElement.addEventListener("click", () => this.showNoteDetail(note));

      if (note.tags && note.tags.length) {
        const tagsContainer = noteElement.querySelector(".note-tags");
        note.tags.forEach((tag) => {
          const tagElement = document.createElement("span");
          tagElement.className = "tag";
          tagElement.textContent = tag;
          tagsContainer.appendChild(tagElement);
        });
      }

      container.appendChild(noteElement);
    });
  }

  showNoteDetail(note) {

    const detailDialog = document.createElement("dialog");
    detailDialog.className = "note-detail-dialog";

    const content = `
            <div class="note-detail">
                <div class="note-detail-header">
                    <h2 class="note-title" contenteditable="true">${
                      note.title || "Untitled"
                    }</h2>
                    <button class="icon-button close-dialog">
                        <i class="material-icons">close</i>
                    </button>
                </div>
                <div class="note-content" contenteditable="true">${
                  note.content
                }</div>
                <div class="note-detail-footer">
                    <button class="save-note">Save</button>
                </div>
            </div>
        `;

    detailDialog.innerHTML = content;
    document.body.appendChild(detailDialog);

    // Set up event listeners
    const closeBtn = detailDialog.querySelector(".close-dialog");
    const saveBtn = detailDialog.querySelector(".save-note");
    const titleElement = detailDialog.querySelector(".note-title");
    const contentElement = detailDialog.querySelector(".note-content");
    contentElement.innerHTML="";
    const contentInput = document.createElement("textarea");
    contentInput.textContent = note.content;
    contentElement.appendChild(contentInput);

    const easyMDE = new EasyMDE({
      element: contentInput,
      parsingConfig: {
        indentWithTabs: false,
        smartIndent: true,
        singleLineBreaks: false,
      },
    });

    closeBtn.addEventListener("click", () => {
      detailDialog.close();
      detailDialog.remove();
    });

    saveBtn.addEventListener("click", async () => {
      const updatedNote = {
        ...note,
        title: titleElement.textContent,
        content: easyMDE.value(),
        updatedAt: new Date().toISOString(),
      };

      const noteIndex = this.notes.findIndex((n) => n.id === note.id);
      console.log(updatedNote);
      if (noteIndex !== -1) {
        this.notes[noteIndex] = updatedNote;
        await setStorageData({ notes: this.notes });
        this.renderNotes();
        detailDialog.close();
        detailDialog.remove();
      }
    });

    detailDialog.showModal();
  }

  async deleteNote(noteId) {
    if (confirm("Are you sure you want to delete this note?")) {
      this.notes = this.notes.filter((note) => note.id !== noteId);
      await this.saveNotes();
      this.renderNotes();
      this.updateNotesCount();
    }
  }

  updateNotesCount() {
    document.getElementById(
      "notes-count"
    ).textContent = `${this.notes.length} notes`;
  }

  updateLastSync() {
    document.getElementById("last-sync").textContent = "Last sync: Just now";
  }

  async openNote(note) {
    if (note.url) {
      await chrome.tabs.update({ url: note.url });
    }
  }

  async initializeSync() {
    // Load last sync time
    const { lastSync } = await getStorageData(['lastSync']);
    this.updateSyncStatus(lastSync);

    // Schedule initial sync
    this.scheduleSync();
  }

  updateSyncStatus(lastSync) {
    if (!lastSync) {
      this.lastSyncElement.textContent = 'Last sync: Never';
    } else {
      const lastSyncDate = new Date(lastSync);
      this.lastSyncElement.textContent = `Last sync: ${lastSyncDate.toLocaleString()}`;
    }
  }

  async scheduleSync() {
    const { notionSettings } = await getStorageData(['notionSettings']);
    if (!notionSettings?.connected || !notionSettings?.autoSync) {
      return;
    }

    // Clear any existing sync timer
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    // Schedule next sync in 5 minutes
    this.syncTimer = setTimeout(() => this.syncToNotion(), 5 * 60 * 1000);
  }

  async syncToNotion() {
    try {
      const { notionSettings, notionDatabaseId } = await getStorageData([
        'notionSettings',
        'notionDatabaseId'
      ]);

      console.log('Sync settings:', { notionSettings, notionDatabaseId });

      if (!notionSettings?.connected || !notionDatabaseId) {
        throw new Error('Notion not connected or database not selected');
      }

      this.syncButton.querySelector('i').classList.add('rotating');
      
      // Fetch existing pages in the database
      const existingPages = await this.fetchNotionPages(notionSettings.accessToken, notionDatabaseId);
      console.log('Existing pages:', existingPages);
      const existingUrls = new Set(existingPages.map(page => page.properties?.URL?.url || ''));
      console.log('Current notes to sync:', this.notes);

      // Sync new or updated notes
      for (const note of this.notes) {
        if (!existingUrls.has(note.url)) {
          console.log('Syncing note:', note);
          try {
            await this.createNotionPage(notionSettings.accessToken, notionDatabaseId, note);
          } catch (error) {
            console.error('Error creating page for note:', note, error);
          }
        }
      }

      // Update last sync time
      const lastSync = new Date().toISOString();
      await setStorageData({ lastSync });
      this.updateSyncStatus(lastSync);

    } catch (error) {
      console.error('Error syncing to Notion:', error);
      this.errorMessage.textContent = 'Failed to sync with Notion: ' + error.message;
      this.errorMessage.style.display = 'block';
      setTimeout(() => {
        this.errorMessage.style.display = 'none';
      }, 3000);
    } finally {
      this.syncButton.querySelector('i').classList.remove('rotating');
    }
  }

  async fetchNotionPages(token, databaseId) {
    try {
      console.log('Fetching pages with token:', token, 'database:', databaseId);
      const response = await fetch(`${NOTION_CONFIG.API_URL}/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Notion-Version': NOTION_CONFIG.API_VERSION
        },
        body: JSON.stringify({
          page_size: 100
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Notion API error:', error);
        throw new Error(`Failed to fetch Notion pages: ${error.message || response.statusText}`);
      }

      const data = await response.json();
      return data.results;
    } catch (error) {
      console.error('Error fetching Notion pages:', error);
      throw error;
    }
  }

  async createNotionPage(token, databaseId, note) {
    try {
      console.log('Creating page with token:', token, 'database:', databaseId, 'note:', note);
      const response = await fetch(`${NOTION_CONFIG.API_URL}/pages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Notion-Version': NOTION_CONFIG.API_VERSION
        },
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: {
            Title: {
              title: [{ text: { content: note.title } }]
            },
            Content: {
              rich_text: [{ text: { content: note.content || note.excerpt || '' } }]
            },
            URL: {
              url: note.url
            },
            Tags: {
              multi_select: note.tags.map(tag => ({ name: tag }))
            },
            CreatedAt: {
              date: { start: note.createdAt || new Date().toISOString() }
            }
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Notion API error:', error);
        throw new Error(`Failed to create Notion page: ${error.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('Created Notion page:', data);
      return data;
    } catch (error) {
      console.error('Error creating Notion page:', error);
      throw error;
    }
  }
}

// Initialize the notes manager when the document is loaded
document.addEventListener("DOMContentLoaded", () => {
  new NotesManager();
});