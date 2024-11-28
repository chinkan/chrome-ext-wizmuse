import "./sidepanel.css";
import { getStorageData, setStorageData } from "./utils/storage.js";

class NotesManager {
  constructor() {
    this.viewMode = "list";
    this.notes = [];
    this.setupEventListeners();
    this.loadNotes();
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
    console.log("showNoteDetail", note);

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

    closeBtn.addEventListener("click", () => {
      detailDialog.close();
      detailDialog.remove();
    });

    saveBtn.addEventListener("click", async () => {
      const updatedNote = {
        ...note,
        title: titleElement.textContent,
        content: contentElement.textContent,
        updatedAt: new Date().toISOString(),
      };

      const noteIndex = this.notes.findIndex((n) => n.id === note.id);
      if (noteIndex !== -1) {
        this.notes[noteIndex] = updatedNote;
        await setStorageData({ notes: this.notes });
        this.renderNotes();
        detailDialog.close();
        detailDialog.remove();
      }
    });

    // Convert markdown to HTML for display
    const markdownHtml = markdown(note.content);
    contentElement.innerHTML = markdownHtml;

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
}

// Initialize the notes manager when the document is loaded
document.addEventListener("DOMContentLoaded", () => {
  new NotesManager();
});
