// js/video-helper.js - Dynamic Video Player Helper
function getVideoPlayerUrl(videoConfig) {
    const currentCourseId = localStorage.getItem('lmsCurrentCourse') || 'instructional-design';
    const params = new URLSearchParams({
        id: videoConfig.id,
        title: encodeURIComponent(videoConfig.title || 'Training Video'),
        course: currentCourseId,
        lesson: videoConfig.lesson || '',
        desc: encodeURIComponent(videoConfig.description || 'Watch this training video to enhance your learning experience.')
    });
    
    return `video-player.html?${params}`;
}

function createVideoButton(videoConfig) {
    const playerUrl = getVideoPlayerUrl(videoConfig);
    
    return `
        <div class="video-button-container">
            <h4>🎬 ${videoConfig.title}</h4>
            <p>${videoConfig.description || 'Click to watch this training video.'}</p>
            <a href="${playerUrl}" class="button video-launch-button">
                Watch Video
            </a>
        </div>
    `;
}

// Initialize video button styles
function initVideoHelper() {
    if (!document.getElementById('video-button-styles')) {
        const styles = `
            <style id="video-button-styles">
                .video-button-container {
                    text-align: center;
                    padding: 2rem;
                    background: #f8f9fa;
                    border-radius: 8px;
                    border: 2px dashed #dee2e6;
                    margin: 1.5rem 0;
                }
                .video-button-container h4 {
                    margin-top: 0;
                    color: #333;
                    font-size: 1.2rem;
                }
                .video-button-container p {
                    margin-bottom: 1.5rem;
                    color: #666;
                    font-size: 0.95rem;
                }
                .video-launch-button {
                    font-size: 1.1rem;
                    padding: 0.75rem 1.5rem;
                    background: var(--primary-color);
                    color: white;
                    text-decoration: none;
                    border-radius: 4px;
                    display: inline-block;
                    transition: background-color 0.2s;
                }
                .video-launch-button:hover {
                    background: var(--primary-dark);
                }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', styles);
    }
}

// Auto-initialize when loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVideoHelper);
} else {
    initVideoHelper();
}
