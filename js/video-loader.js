// js/video-loader.js - Ultra Simple Video Loader
function getVideoEmbed(fileId, videoTitle = 'Training Video') {
    return `
        <div style="text-align: center; margin: 2rem 0;">
            <h4>${videoTitle}</h4>
            <video controls width="100%" style="max-width: 800px; border-radius: 8px;" 
                   onerror="showVideoFallback(this, '${fileId}')">
                <source src="https://drive.google.com/uc?export=download&id=${fileId}" type="video/mp4">
                Your browser doesn't support HTML5 video.
            </video>
            <div class="video-fallback" style="display: none; margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                <a href="https://drive.google.com/file/d/${fileId}/view" class="button">Watch on Google Drive</a>
            </div>
            <script>
                function showVideoFallback(video, fileId) {
                    video.style.display = 'none';
                    video.nextElementSibling.style.display = 'block';
                }
            </script>
        </div>
    `;
}