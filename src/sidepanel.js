import "./sidepanel.css";
import { getStorageData, removeStorageData, getAllStorageData, setStorageData } from "./utils/storage.js";
import EasyMDE from "easymde";
import {NOTION_CONFIG} from "./config/notion.js";


class NotesManager {
  constructor() {
    this.viewMode = "list";
    this.notes = [];
    this.loadConfig();
    this.setupElements();
    this.setupEventListeners();
    this.loadNotes();
    this.initializeSync();
  }

  loadConfig(){
    this.config = NOTION_CONFIG;
  }

  setupElements() {
    this.loadIndicator = document.getElementById("loading-indicator");
    this.errorMessage = document.getElementById("error-message");
    this.lastSyncElement = document.getElementById("last-sync");
    this.notesListView= document.getElementById("list-view");
    this.notesGridView = document.getElementById("grid-view");
    this.searchInput = document.getElementById("search-input");
    this.newNoteButton = document.getElementById("new-note");
    this.optionsButton = document.getElementById("open-options");
    this.notesContainer = document.getElementById("notes-container");
    this.notesTemplate = document.getElementById("note-template");
    this.notesCount = document.getElementById("notes-count");
  }

  setupEventListeners() {
    // View mode toggles
    this.notesListView.addEventListener("click", () => this.setViewMode("list"));
    this.notesGridView.addEventListener("click", () => this.setViewMode("grid"));

    // Search functionality
    this.searchInput.addEventListener("input", (e) => this.handleSearch(e.target.value));

    // New note button
    this.newNoteButton.addEventListener("click", () => this.createNewNote());

    // Options button
    this.optionsButton.addEventListener("click", () => {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL("options.html"));
      }
    });
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.classList.add('show');
    }, 100);

    setTimeout(() => {
      errorDiv.classList.remove('show');
      setTimeout(() => errorDiv.remove(), 300);
    }, 5000);
  }

  showLoading(show = true) {
    this.loadIndicator.style.display = show ? "flex" : "none";
    const newNoteButton = document.getElementById("new-note");
    if (show) {
      this.originalButtonIcon = newNoteButton.innerHTML;
      newNoteButton.innerHTML = '<i class="material-icons rotating">sync</i>';
    } else if (this.originalButtonIcon) {
      newNoteButton.innerHTML = this.originalButtonIcon;
    }
  }

  async loadNotes() {
    try {
      const result = await getAllStorageData();
      // Filter for notes (excluding histories and settings)
      this.notes = Object.entries(result)
        .filter(([key]) => key.startsWith('notes.'))
        .map(([_, note]) => note)
        .sort((a, b) => b.timestamp - a.timestamp);

      console.log('Loaded notes:', this.notes);
      
      this.renderNotes();
      this.updateNotesCount();
    } catch (error) {
      console.error('Error loading notes:', error);
      this.showError('Failed to load notes');
      throw error;
    }
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.notesContainer.className = `notes-container ${mode}-view`;

    // Update active state of view buttons
    this.notesListView
      .classList.toggle("active", mode === "list");
    this.notesGridView
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

      if (!tab) {
        throw new Error('No active tab found');
      }

      // Get page content
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
        const tags = await this.generateTags(response.summary);

        console.log("Generated tags:", tags);

        const timestamp = Date.now();
        const noteKey = `notes.${timestamp}`;
        const noteData = {
          key: noteKey,
          id: timestamp,
          url: url,
          title: title,
          content: response.summary,
          tags: tags,
          timestamp: timestamp,
          promptName: response.promptName,
          providerName: response.providerName,
          type: 'summary'
        };
        
        await setStorageData({
          [noteKey]: noteData
        });

        // Also save to history
        const historyKey = `histories.${url}`;
        const historyData = {
          summary: response.summary,
          title: title,
          timestamp: timestamp,
          promptName: response.promptName,
          providerName: response.providerName
        };
        await setStorageData({
          [historyKey]: historyData
        });
        return response.summary;
      }

      throw new Error("Invalid summary response");
    } catch (error) {
      console.error("Error summarizing website:", {
        message: error.message,
        stack: error.stack,
        url: url,
        title: title
      });

      let errorMessage = "Failed to summarize the website. Please try again later.";
      
      if (error.message.includes('QuotaExceeded')) {
        errorMessage = "API quota has been exceeded. Please try again later.";
      } else if (error.message.includes('RateLimitExceeded')) {
        errorMessage = "Content is too large to summarize. Please try with a smaller selection.";
      }

      this.showError(errorMessage);
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
      this.showLoading(true);
      this.errorMessage.style.display = "none";

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab) {
        this.showError("No active tab found, please try to refresh the page.");
        this.showLoading(false);
        return;
      }

      let summary;
      try {
        summary = await this.summarizeWebsite(tab.url, tab.title);
      } catch (error) {
        console.error("Error getting summary:", error);
        summary = "Failed to generate summary. Click to add content...";
      }

      await this.loadNotes(); // Reload notes after creating a new one
      return summary;
    } catch (error) {
      console.error('Error creating new note:', error);
      this.showError('Failed to create new note');
      throw error;
    } finally {
      this.showLoading(false);
    }
  }

  async deleteNote(noteId) {
    try {
      const confirmDelete = confirm("Are you sure you want to delete this note?");
      if (!confirmDelete) return;

      const noteKey = `notes.${noteId}`;
      await removeStorageData(noteKey);
      await this.loadNotes(); // Reload notes after deletion
    } catch (error) {
      console.error('Error deleting note:', error);
      this.showError('Failed to delete note');
      throw error;
    }
  }

  async saveNotes(note) {
    try {
      await setStorageData({ [note.key]: note });
      this.updateLastSync();
      this.scheduleSync();
    } catch (error) {
      console.error("Error saving notes:", error);
      this.showError("Failed to save notes");
      setTimeout(() => {
        this.errorMessage.style.display = "none";
      }, 3000);
    }
  }

  renderNotes(notesToRender = this.notes) {
    this.notesContainer.innerHTML = "";

    notesToRender.forEach((note) => {
      const noteElement = this.notesTemplate.content
        .cloneNode(true)
        .querySelector(".note-item");
      const plainText = note.content.replace(/[#*`_~\[\]]/g, "");
      const preview =
        plainText.substring(0, 100) + (plainText.length > 100 ? "..." : "");

      noteElement.querySelector(".note-title").textContent =
        note.title || "Untitled";
      noteElement.querySelector(".note-content").textContent = preview;
      noteElement.setAttribute("data-note-id", note.id);

      // Add timestamp
      const timestampElement = document.createElement("div");
      timestampElement.className = "note-timestamp";
      timestampElement.textContent = new Date(note.timestamp).toLocaleString();
      noteElement.appendChild(timestampElement);

      noteElement.addEventListener("click", () => this.showNoteDetail(note));

      const deleteButton = noteElement.querySelector(".delete-note");
      deleteButton.addEventListener("click", (e) => {
        e.stopPropagation();
        this.deleteNote(note.id);
      });

      if (note.tags && note.tags.length) {
        const tagsContainer = noteElement.querySelector(".note-tags");
        note.tags.forEach((tag) => {
          const tagElement = document.createElement("span");
          tagElement.className = "tag";
          const hiddenInput = document.createElement('input');
          hiddenInput.type = 'hidden';
          hiddenInput.value = tag;
          const tagTextSpan = document.createElement('span');
          tagTextSpan.className = 'tag-text';
          tagTextSpan.textContent = tag;
          const removeIcon = document.createElement('i');
          removeIcon.className = 'material-icons remove-tag';
          removeIcon.textContent = 'close';
          tagElement.appendChild(hiddenInput);
          tagElement.appendChild(tagTextSpan);
          tagElement.appendChild(removeIcon);
          tagsContainer.appendChild(tagElement);
        });
      }

      this.notesContainer.appendChild(noteElement);
    });
  }

  showNoteDetail(note) {
    const detailDialog = document.createElement("dialog");
    detailDialog.className = "note-detail-dialog";

    const content = `
      <div class="note-detail">
        <div class="note-detail-header">
          <h2 class="note-title" contenteditable="true">${note.title || "Untitled"}</h2>
          <button class="icon-button close-dialog">
            <i class="material-icons">close</i>
          </button>
        </div>
        <div class="note-content"></div>
        <div class="note-tags-container">
          <div class="note-tags">
            ${note.tags ? note.tags.map(tag => `
              <span class="tag">
                <input type="hidden" value="${tag}">
                <span class="tag-text">${tag}</span>
                <i class="material-icons remove-tag">close</i>
              </span>`).join('') : ''}
          </div>
          <div class="add-tag-container">
            <input type="text" class="tag-input" placeholder="Add new tag...">
            <button class="add-tag-btn">
              <i class="material-icons">add</i>
            </button>
          </div>
        </div>
        <div class="note-detail-footer">
          <button class="save-note">Save</button>
        </div>
      </div>
    `;

    detailDialog.innerHTML = content;
    document.body.appendChild(detailDialog);

    const closeBtn = detailDialog.querySelector(".close-dialog");
    const saveBtn = detailDialog.querySelector(".save-note");
    const titleElement = detailDialog.querySelector(".note-title");
    const contentElement = detailDialog.querySelector(".note-content");
    const tagsContainer = detailDialog.querySelector(".note-tags");
    const tagInput = detailDialog.querySelector(".tag-input");
    const addTagBtn = detailDialog.querySelector(".add-tag-btn");

    const contentInput = document.createElement("textarea");
    contentInput.textContent = note.content;
    contentElement.appendChild(contentInput);

    const easyMDE = new EasyMDE({
      element: contentInput,
      spellChecker: false,
    });

    const addTag = (tagText) => {
      if (tagText.trim()) {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag';
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.value = tagText.trim();
        const tagTextSpan = document.createElement('span');
        tagTextSpan.className = 'tag-text';
        tagTextSpan.textContent = tagText.trim();
        const removeIcon = document.createElement('i');
        removeIcon.className = 'material-icons remove-tag';
        removeIcon.textContent = 'close';
        
        tagSpan.appendChild(hiddenInput);
        tagSpan.appendChild(tagTextSpan);
        tagSpan.appendChild(removeIcon);
        tagsContainer.appendChild(tagSpan);
        tagInput.value = '';
      }
    };

    addTagBtn.addEventListener('click', () => {
      addTag(tagInput.value);
    });

    tagInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag(tagInput.value);
      }
    });

    tagsContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-tag')) {
        e.target.parentElement.remove();
      }
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
        tags: Array.from(tagsContainer.querySelectorAll('.tag input[type="hidden"]')).map(input => input.value),
        updatedAt: new Date().toISOString(),
      };

      const noteIndex = this.notes.findIndex((n) => n.id === note.id);
      if (noteIndex !== -1) {
        this.notes[noteIndex] = updatedNote;
        await this.saveNotes(this.notes[noteIndex]);
        this.renderNotes();
        detailDialog.close();
        detailDialog.remove();
      }
    });

    detailDialog.showModal();
  }

  async updateNote(noteId, updates) {
    try {
      const noteKey = `notes.${noteId}`;
      const result = await getStorageData([noteKey]);
      const note = result[noteKey];
      
      if (!note) {
        throw new Error('Note not found');
      }

      const updatedNote = {
        ...note,
        ...updates,
        key: noteKey,
      };

      await setStorageData({
        [noteKey]: updatedNote
      });
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }

  updateNotesCount() {
    this.notesCount.textContent = `${this.notes.length} notes`;
  }

  updateLastSync() {
    this.lastSyncElement.textContent = "Last sync: Just now";
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
    console.log(notionSettings);
    if (!notionSettings?.connected && !notionSettings?.autoSync) {
      return;
    }

    // Clear any existing sync timer
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    // Schedule next sync in 30 seconds
    this.syncTimer = setTimeout(() => this.syncToNotion(), 30 * 1000);
  }

  async syncToNotion() {
    try {
      // Get Notion settings
      const config = await getStorageData(['notionSettings']);
      const { notionSettings } = config;
      
      if (!notionSettings || !notionSettings.connected || !notionSettings.selectedDatabaseId) {
        throw new Error('Notion configuration is missing. Please set up Notion integration first.');
      }

      // Get notes that need syncing (created or updated after last sync)
      const lastSync = await getStorageData(['lastSync']);
      const lastSyncTime = new Date(lastSync?.lastSync || 0).getTime();
      
      const notesToSync = this.notes.filter(note => {
        const noteCreatedTime = new Date(note.timestamp).getTime();
        return noteCreatedTime > lastSyncTime || !note.lastSyncTime;
      });

      const lastSyncElement = document.getElementById('last-sync');

      if (notesToSync.length === 0) {
        lastSyncElement.textContent = 'Last sync: All notes up to date';
        return;
      }

      lastSyncElement.textContent = `Last sync: Syncing ${notesToSync.length} notes...`;

      // Sync each note
      for (const note of notesToSync) {
        try {
          await this.createNotionPage(note, notionSettings);
          // Mark note as synced
          await this.updateNote(note.id, { 
            ...note,
            syncedToNotion: true,
            lastSyncTime: Date.now()
          });
        } catch (error) {
          console.error('Error creating page for note:', {
            noteId: note.id,
            error: error
          });
          throw new Error(`Failed to create Notion page: ${error.message}`);
        }
      }

      // Update sync status
      lastSyncElement.textContent = `Last sync: Just now`;

      await setStorageData({ lastSync: Date.now() });

      this.initializeSync();

      // Refresh notes display
      await this.loadNotes();
    } catch (error) {
      console.error('Error syncing to Notion:', error);
      const lastSyncElement = document.getElementById('last-sync');
      lastSyncElement.textContent = `Last sync: Error: ${error.message}`;
      throw error;
    }
  }

  async createNotionPage(note, notionSettings) {
    try {
      if (!note || !notionSettings) {
        throw new Error('Invalid note or configuration');
      }

      const { title, content, url, tags = [], timestamp } = note;
      
      const notionTags = Array.isArray(tags) ? tags.map(tag => ({ name: tag })) : [];

      const blocks = this.splitContentIntoBlocks(content);

      const response = await fetch(`${NOTION_CONFIG.API_URL}/pages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionSettings.accessToken}`,
          'Content-Type': 'application/json',
          'Notion-Version': NOTION_CONFIG.API_VERSION
        },
        body: JSON.stringify({
          parent: { database_id: notionSettings.selectedDatabaseId },
          properties: {
            Title: { title: [{ text: { content: title || 'Untitled Note' } }] },
            Content: { rich_text: [{ text: { content: blocks[0].slice(0, 2000) || '' } }] },
            URL: { url: url || '' },
            Tags: { multi_select: notionTags },
            CreatedAt: { date: { start: new Date(timestamp).toISOString() } }
          },
          children: blocks.map(block => ({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: block } }]
            }
          }))
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Notion API error:', error);
        throw new Error(error.message || 'Failed to create Notion page');
      }

      return await response.json();
    } catch (error) {
      console.error('Notion API error:', error);
      throw error;
    }
  }

  splitContentIntoBlocks(content) {
    const maxLength = 2000;
    const blocks = [];
    for (let i = 0; i < content.length; i += maxLength) {
      blocks.push(content.slice(i, i + maxLength));
    }
    return blocks;
  }

  async generateTags(content) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "generateTags",
        text: content,
      });

      if (response && response.error) {
        throw new Error(response.error);
      }

      if (response && response.tags) {
        console.log("Generated tags:", response.tags);
        return response.tags;
      }

      return [];
    } catch (error) {
      console.error("Error generating tags:", error);
      return [];
    }
  }
}

// Initialize the notes manager when the document is loaded
document.addEventListener("DOMContentLoaded", () => {
  new NotesManager();
});
