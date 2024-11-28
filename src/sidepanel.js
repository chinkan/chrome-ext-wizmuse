import './sidepanel.css'
import { getStorageData, setStorageData } from './utils/storage.js';

class NotesManager {
    constructor() {
        this.viewMode = 'list';
        this.notes = [];
        this.setupEventListeners();
        this.loadNotes();
    }

    setupEventListeners() {
        // View mode toggles
        document.getElementById('list-view').addEventListener('click', () => this.setViewMode('list'));
        document.getElementById('grid-view').addEventListener('click', () => this.setViewMode('grid'));

        // Search functionality
        document.getElementById('search-input').addEventListener('input', (e) => this.handleSearch(e.target.value));

        // New note button
        document.getElementById('new-note').addEventListener('click', () => this.createNewNote());
    }

    async loadNotes() {
        try {
            const result = await getStorageData(['notes']);
            this.notes = result.notes || [];
            this.renderNotes();
            this.updateNotesCount();
        } catch (error) {
            console.error('Error loading notes:', error);
        }
    }

    setViewMode(mode) {
        this.viewMode = mode;
        const container = document.getElementById('notes-container');
        container.className = `notes-container ${mode}-view`;

        // Update active state of view buttons
        document.getElementById('list-view').classList.toggle('active', mode === 'list');
        document.getElementById('grid-view').classList.toggle('active', mode === 'grid');
    }

    handleSearch(query) {
        const filteredNotes = this.notes.filter(note => 
            note.title.toLowerCase().includes(query.toLowerCase()) ||
            note.excerpt.toLowerCase().includes(query.toLowerCase()) ||
            note.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
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
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const contentResponse = await chrome.tabs.sendMessage(tab.id, {
                action: 'getPageContent',
            });

            if (!contentResponse || !contentResponse.content) {
                throw new Error('Failed to get page content');
            }

            const response = await chrome.runtime.sendMessage({
                action: 'summarize',
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
            
            throw new Error('Invalid summary response');
        } catch (error) {
            console.error('Error summarizing website:', error);
            throw error;
        }
    }

    async getPageContent(tab) {
        try {
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'getPageContent',
            });
            return response.content;
        } catch (error) {
            console.error('Error getting page content:', error);
            throw error;
        }
    }

    async createNewNote() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Show loading state
            const newNoteButton = document.getElementById('new-note');
            const originalIcon = newNoteButton.innerHTML;
            newNoteButton.innerHTML = '<i class="material-icons rotating">sync</i>';
            
            // Get summary
            let summary;
            try {
                summary = await this.summarizeWebsite(tab.url, tab.title);
            } catch (error) {
                console.error('Error getting summary:', error);
                summary = 'Failed to generate summary. Click to add content...';
            }

            const newNote = {
                id: Date.now(),
                title: tab.title || 'New Note',
                date: new Date().toISOString().split('T')[0],
                tags: [],
                source: new URL(tab.url).hostname,
                excerpt: summary,
                content: summary,
                url: tab.url,
                timestamp: Date.now()
            };

            this.notes.unshift(newNote);
            await this.saveNotes();
            this.renderNotes();
            this.updateNotesCount();

            // Restore button state
            newNoteButton.innerHTML = originalIcon;
        } catch (error) {
            console.error('Error creating new note:', error);
            // Restore button state on error
            const newNoteButton = document.getElementById('new-note');
            newNoteButton.innerHTML = '<i class="material-icons">add</i>';
        }
    }

    async saveNotes() {
        try {
            await setStorageData({ notes: this.notes });
            this.updateLastSync();
        } catch (error) {
            console.error('Error saving notes:', error);
        }
    }

    renderNotes(notesToRender = this.notes) {
        const container = document.getElementById('notes-container');
        container.innerHTML = '';
        const template = document.getElementById('note-template');

        notesToRender.forEach(note => {
            const noteElement = template.content.cloneNode(true);
            
            // Fill in note data
            noteElement.querySelector('.note-title').textContent = note.title;
            noteElement.querySelector('.note-excerpt').textContent = note.excerpt;
            noteElement.querySelector('.note-date').textContent = note.date;
            noteElement.querySelector('.note-source').textContent = note.source;

            // Add tags
            const tagsContainer = noteElement.querySelector('.note-tags');
            note.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                tagElement.textContent = tag;
                tagsContainer.appendChild(tagElement);
            });

            // Add delete button event
            const deleteButton = noteElement.querySelector('.delete-note');
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent note opening when deleting
                this.deleteNote(note.id);
            });

            // Add click event
            const noteItem = noteElement.querySelector('.note-item');
            noteItem.addEventListener('click', () => this.openNote(note));

            container.appendChild(noteElement);
        });
    }

    async deleteNote(noteId) {
        if (confirm('Are you sure you want to delete this note?')) {
            this.notes = this.notes.filter(note => note.id !== noteId);
            await this.saveNotes();
            this.renderNotes();
            this.updateNotesCount();
        }
    }

    updateNotesCount() {
        document.getElementById('notes-count').textContent = `${this.notes.length} notes`;
    }

    updateLastSync() {
        document.getElementById('last-sync').textContent = 'Last sync: Just now';
    }

    async openNote(note) {
        if (note.url) {
            await chrome.tabs.update({ url: note.url });
        }
    }
}

// Initialize the notes manager when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NotesManager();
});
