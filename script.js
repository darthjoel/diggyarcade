document.addEventListener('DOMContentLoaded', () => {
    const gameItems = document.querySelectorAll('.game-item');
    let currentIndex = 0;

    function updateSelection() {
        gameItems.forEach((item, index) => {
            if (index === currentIndex) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    const bgMusic = document.getElementById('bg-music');
    const muteBtn = document.getElementById('mute-btn');
    const splashScreen = document.getElementById('splash-screen');
    const enterBtn = document.getElementById('enter-btn');
    let musicStarted = false;

    function startMusic() {
        if (!musicStarted && bgMusic) {
            bgMusic.play().then(() => {
                musicStarted = true;
                updateMuteButton();
                // Remove the global triggers once music has started
                document.removeEventListener('click', startMusic);
                document.removeEventListener('keydown', startMusic);
                document.removeEventListener('touchstart', startMusic);
            }).catch(err => {
                console.log("Audio playback failed:", err);
            });
        }
    }

    if (enterBtn) {
        enterBtn.addEventListener('click', () => {
            startMusic();
            if (splashScreen) {
                splashScreen.classList.add('hidden');
            }
        });
    }

    // Attempt playback on first interaction
    document.addEventListener('click', startMusic);
    document.addEventListener('keydown', startMusic);
    document.addEventListener('touchstart', startMusic);

    function toggleMute() {
        if (!bgMusic) return;

        if (!musicStarted) {
            startMusic();
            return;
        }

        bgMusic.muted = !bgMusic.muted;
        updateMuteButton();
    }

    function updateMuteButton() {
        if (!muteBtn || !bgMusic) return;
        if (bgMusic.muted) {
            muteBtn.innerText = 'UNMUTE';
            muteBtn.classList.add('muted');
        } else {
            muteBtn.innerText = 'MUTE';
            muteBtn.classList.remove('muted');
        }
    }

    // Initialize state from query param
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('sound') === 'false') {
        if (bgMusic) bgMusic.muted = true;
        updateMuteButton();
    }

    if (muteBtn) {
        muteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering game selection
            toggleMute();
        });
    }

    document.addEventListener('keydown', (e) => {
        startMusic();
        if (e.key === 'ArrowUp') {
            currentIndex = (currentIndex > 0) ? currentIndex - 1 : gameItems.length - 1;
            updateSelection();
        } else if (e.key === 'ArrowDown') {
            currentIndex = (currentIndex < gameItems.length - 1) ? currentIndex + 1 : 0;
            updateSelection();
        } else if (e.key === 'Enter') {
            gameItems[currentIndex].click();
        }
    });

    // Support mouse hover as well
    gameItems.forEach((item, index) => {
        item.addEventListener('mouseenter', () => {
            currentIndex = index;
            updateSelection();
        });
        item.addEventListener('click', () => {
            startMusic();
        });
    });
});
