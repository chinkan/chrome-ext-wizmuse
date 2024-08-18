document.addEventListener('DOMContentLoaded', function () {
    const readButton = document.getElementById('read-button');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const summaryContainer = document.getElementById('summary-container');

    readButton.addEventListener('click', function () {
        console.log('Reading button clicked');
        loadingIndicator.style.display = 'block';
        errorMessage.style.display = 'none';
        summaryContainer.style.display = 'none';

        chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    { action: 'getPageContent' },
                    function (response) {
                        console.error(
                            'Response received:',
                            JSON.stringify(response)
                        );
                        if (chrome.runtime.lastError) {
                            console.error('Error:', chrome.runtime.lastError);
                            errorMessage.textContent =
                                'Error: ' + chrome.runtime.lastError.message;
                            errorMessage.style.display = 'block';
                            loadingIndicator.style.display = 'none';
                            return;
                        }
                        if (response && response.content) {
                            chrome.runtime.sendMessage(
                                { action: 'summarize', text: response.content },
                                function (response) {
                                    console.log(
                                        'Summarization response:',
                                        response
                                    );
                                    if (chrome.runtime.lastError) {
                                        console.error(
                                            'Runtime error:',
                                            chrome.runtime.lastError
                                        );
                                        errorMessage.textContent =
                                            'Error: ' +
                                            chrome.runtime.lastError.message;
                                        errorMessage.style.display = 'block';
                                        loadingIndicator.style.display = 'none';
                                    } else if (response && response.error) {
                                        console.error(
                                            'Summarization error:',
                                            response.error
                                        );
                                        errorMessage.textContent =
                                            'Error: ' + response.error;
                                        errorMessage.style.display = 'block';
                                        loadingIndicator.style.display = 'none';
                                    } else if (response && response.summary) {
                                        displaySummary(response.summary);
                                    } else {
                                        errorMessage.textContent =
                                            'Error: Invalid summarization response';
                                        errorMessage.style.display = 'block';
                                        loadingIndicator.style.display = 'none';
                                    }
                                }
                            );
                        } else {
                            console.error('Invalid response:', response);
                            errorMessage.textContent =
                                'Error: Invalid response';
                            errorMessage.style.display = 'block';
                            loadingIndicator.style.display = 'none';
                        }
                    }
                );
            }
        );
    });

    function displaySummary(summary) {
        document.getElementById('summary').textContent = summary.summary;
        // document.getElementById('featured-points').innerHTML =
        //     summary.featuredPoints.map((point) => `<li>${point}</li>`).join('');
        // document.getElementById('full-summary').textContent =
        //     summary.fullSummary;
        // document.getElementById('examples').textContent = summary.examples;
        // document.getElementById('tags').textContent = summary.tags.join(', ');
        summaryContainer.style.display = 'block';
        loadingIndicator.style.display = 'none';
    }

    document
        .getElementById('share-twitter')
        .addEventListener('click', shareTwitter);
    document
        .getElementById('share-facebook')
        .addEventListener('click', shareFacebook);
    document
        .getElementById('share-linkedin')
        .addEventListener('click', shareLinkedIn);
    document
        .getElementById('add-to-notion')
        .addEventListener('click', addToNotion);
});

function shareTwitter() {
    // Implement Twitter sharing
}

function shareFacebook() {
    // Implement Facebook sharing
}

function shareLinkedIn() {
    // Implement LinkedIn sharing
}

function addToNotion() {
    // Implement Notion integration
}
