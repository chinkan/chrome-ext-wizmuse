import { YoutubeTranscript } from 'youtube-transcript';

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'getPageContent') {
        // Check if current URL is a YouTube video
        const url = window.location.href;
        const isYouTube = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);

        if (isYouTube) {
            // Handle YouTube video
            YoutubeTranscript.fetchTranscript(url)
                .then(transcript => {
                    // Combine all text parts from the transcript
                    const content = transcript.map(part => part.text).join(' ');
                    sendResponse({ content: content });
                })
                .catch(error => {
                    console.error('Error fetching YouTube transcript:', error);
                    // Fallback to regular text extraction if transcript fails
                    sendFallbackContent();
                });
            return true; // Required for async response
        } else {
            // Handle non-YouTube pages
            sendFallbackContent();
        }
    }

    function sendFallbackContent() {
        // Regular text extraction for non-YouTube pages
        let content = document.body.innerText;
        content = content.replace(/\s+/g, ' ').trim(); // Remove extra whitespace
        content = content.replace(/<[^>]*>/g, ''); // Remove HTML tags
        sendResponse({ content: content });
    }
});
