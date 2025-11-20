// js/video-helper.js - Dynamic video URL generator
function getVideoPlayerUrl(videoConfig) {
    const params = new URLSearchParams({
        id: videoConfig.id,
        title: encodeURIComponent(videoConfig.title || 'Training Video'),
        course: videoConfig.course || '',
        lesson: videoConfig.lesson || '',
        desc: encodeURIComponent(videoConfig.description || 'Watch this training video.')
    });
    
    return `video-player.html?${params}`;
}

function createVideoButton(videoConfig) {
    const playerUrl = getVideoPlayerUrl(videoConfig);
    
    return `
        <div style="text-align: center; padding: 2rem; background: #f8f9fa; border-radius: 8px; border: 2px dashed #dee2e6;">
            <h4 style="margin-top: 0; color: #333;">🎬 ${videoConfig.title}</h4>
            <p style="margin-bottom: 1.5rem; color: #666;">Click to watch in our custom player.</p>
            <a href="${playerUrl}" class="button" style="font-size: 1.1rem; padding: 0.75rem 1.5rem;">
                Watch Video
            </a>
        </div>
    `;
}