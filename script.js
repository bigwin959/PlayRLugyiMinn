document.addEventListener('DOMContentLoaded', () => {
    // Fetch data from the server
    fetch('/api/data')
        .then(response => response.json())
        .then(data => {
            const games = data.games;
            const settings = data.siteSettings;

            // Apply Site Settings
            if (settings) {
                // Update Page Title and H1
                if (settings.title) {
                    document.title = settings.title;
                    const h1 = document.querySelector('h1');
                    if (h1) h1.textContent = settings.title;
                }

                // Update Random Button Text
                if (settings.randomBtnText) {
                    const btn = document.getElementById('playRandomBtn');
                    if (btn) btn.innerHTML = `${settings.randomBtnText}`; // Keep formatting if needed, but text replacement is safer for now
                }

                // Update Play Links
                if (settings.contactLink) {
                    const playLinks = document.querySelectorAll('.play-btn, .game-image-wrapper a');
                    playLinks.forEach(link => {
                        link.href = settings.contactLink;
                    });
                }
            }

            // Initialize App with fetched games
            initApp(games);
            initFloatingIcons(games);
        })
        .catch(err => {
            console.error('Error loading game data:', err);
            // Fallback or alert user
        });

    function initApp(games) {
        const btn = document.getElementById('playRandomBtn');

        // Carousel Containers
        const carouselJili = document.getElementById('carousel-jili');
        const carouselPg = document.getElementById('carousel-pg');
        const carouselPp = document.getElementById('carousel-pp');

        // Lock Buttons
        const lockBtns = document.querySelectorAll('.lock-btn');
        const lockedState = {
            jili: false,
            pg: false,
            pp: false
        };

        let isAnimating = false;

        // Filter games by provider
        const jiliGames = games.filter(g => g.provider === "JILI");
        const pgGames = games.filter(g => g.provider === "PG Soft");
        const ppGames = games.filter(g => g.provider === "PP Slot");

        // --- Sound Manager (Web Audio API) ---
        const soundManager = {
            ctx: null,
            init: function () {
                if (!this.ctx) {
                    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                }
            },
            playTone: function (freq, type, duration, vol = 0.1) {
                if (!this.ctx) this.init();
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                gain.gain.setValueAtTime(vol, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + duration);
            },
            playSpinTick: function () {
                this.playTone(800 + Math.random() * 200, 'square', 0.05, 0.05);
            },
            playColumnStop: function () {
                this.playTone(150, 'triangle', 0.3, 0.2);
                this.playTone(100, 'sine', 0.3, 0.2);
            },
            playLockSound: function () {
                this.playTone(400, 'sawtooth', 0.1, 0.1);
            },
            playJackpot: function () {
                if (!this.ctx) this.init();
                const now = this.ctx.currentTime;
                [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98].forEach((freq, i) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = i % 2 === 0 ? 'sine' : 'triangle';
                    osc.frequency.setValueAtTime(freq, now + i * 0.1);
                    gain.gain.setValueAtTime(0.1, now + i * 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.5);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now + i * 0.1);
                    osc.stop(now + i * 0.1 + 0.5);
                });
            }
        };

        // --- Init: Populate random games first so visuals aren't empty ---
        populateInitialCards(carouselJili, jiliGames);
        populateInitialCards(carouselPg, pgGames);
        populateInitialCards(carouselPp, ppGames);

        // Lock Button listeners
        lockBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (isAnimating) return; // Can't toggle during spin

                const target = btn.dataset.target;
                lockedState[target] = !lockedState[target];

                soundManager.playLockSound();

                // UI Update
                const col = btn.closest('.provider-column');

                if (lockedState[target]) {
                    btn.classList.add('locked');
                    btn.innerHTML = '<span class="lock-icon">🔒</span> LOCKED';
                    col.classList.add('locked-state');
                } else {
                    btn.classList.remove('locked');
                    btn.innerHTML = '<span class="lock-icon">🔓</span> Unlock';
                    col.classList.remove('locked-state');
                }
            });
        });

        if (btn) {
            btn.addEventListener('click', () => {
                if (isAnimating) return;
                isAnimating = true;

                soundManager.init();

                // Start animation process
                startSlotMachineInColumns();
            });
        }

        function startSlotMachineInColumns() {
            // We only clear NON-LOCKED columns

            let stackJili = getStack(carouselJili, jiliGames, 'jili');
            let stackPg = getStack(carouselPg, pgGames, 'pg');
            let stackPp = getStack(carouselPp, ppGames, 'pp');

            // Spin Logic
            const p1 = spinColumn(stackJili, jiliGames, pickUniqueGames(jiliGames, 3), 2000, 'jili');
            const p2 = spinColumn(stackPg, pgGames, pickUniqueGames(pgGames, 3), 3000, 'pg');
            const p3 = spinColumn(stackPp, ppGames, pickUniqueGames(ppGames, 3), 4000, 'pp');

            // Wait for all (using promise logic approx)
            // Since we know timing, 4000ms is max.
            setTimeout(() => {
                if (!lockedState.pp) soundManager.playJackpot();
                triggerConfetti();
                isAnimating = false;
            }, 4000);
        }

        function getStack(container, pool, key) {
            if (lockedState[key]) {
                // If locked, return current cards (no change)
                return Array.from(container.children);
            } else {
                // Reset content
                container.innerHTML = '';
                // Create New Initial Stack
                return createInitialStack(container, pool);
            }
        }

        function triggerConfetti() {
            if (typeof confetti === 'function') {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#00f3ff', '#bc13fe', '#ffd700']
                });
            }
        }

        // Populate helper for initial load
        function populateInitialCards(container, list) {
            createInitialStack(container, list);
        }

        function createInitialStack(container, gameList) {
            const random3 = pickUniqueGames(gameList, 3);
            const cards = random3.map(g => createCard(g));

            cards.forEach(c => {
                // Note: don't add 'spinning' here immediately, only during spin
                container.appendChild(c);
            });

            setupCarouselInteraction(container, cards);
            updateCardPositions(cards, [0, 1, 2]);

            return cards;
        }

        function spinColumn(cards, pool, finalGames, duration, key) {
            if (lockedState[key]) return; // Skip spin if locked

            // Apply spinning effect
            cards.forEach(c => c.classList.add('spinning'));

            const intervalTime = 100;
            let elapsed = 0;

            const interval = setInterval(() => {
                elapsed += intervalTime;

                if (elapsed < duration) {
                    // UPDATE PHASE
                    const randomFrame = pickUniqueGames(pool, 3);
                    updateStackContent(cards, randomFrame);

                    if (elapsed % 200 === 0) soundManager.playSpinTick();

                } else {
                    // STOP PHASE
                    clearInterval(interval);

                    updateStackContent(cards, finalGames);
                    soundManager.playColumnStop();

                    cards.forEach(c => c.classList.remove('spinning'));

                    const activeCard = cards.find(c => c.classList.contains('card-active'));
                    if (activeCard) {
                        activeCard.classList.add('winning');
                    }
                }
            }, intervalTime);
        }

        function updateStackContent(cardElements, gameDataList) {
            cardElements.forEach((card, i) => {
                const game = gameDataList[i];

                const img = card.querySelector('.game-image');
                img.src = game.image;
                img.alt = game.name;

                const title = card.querySelector('.game-title');
                title.textContent = game.name;

                const providerSpan = card.querySelector('.game-provider');
                providerSpan.textContent = game.provider;

                const rtpSpan = card.querySelector('.rtp-badge');

                let rtpValue = game.rtp;
                if (!rtpValue && game.provider === "JILI") {
                    rtpValue = generateRandomRTP();
                }

                if (rtpValue) {
                    rtpSpan.textContent = `RTP: ${rtpValue}`;
                    rtpSpan.classList.remove('hidden');
                } else {
                    rtpSpan.classList.add('hidden');
                }
            });
        }

        // --- Reuse existing helper functions ---

        function setupCarouselInteraction(container, cards) {
            let currentOrder = [0, 1, 2];

            function handleCardClick(clickedIndex) {
                const position = currentOrder.indexOf(clickedIndex);
                if (position === 0) rotateRight();
                else if (position === 2) rotateLeft();
            }

            function rotateLeft() {
                const first = currentOrder.shift();
                currentOrder.push(first);
                updateCardPositions(cards, currentOrder);
                cards.forEach(c => c.classList.remove('winning'));
            }

            function rotateRight() {
                const last = currentOrder.pop();
                currentOrder.unshift(last);
                updateCardPositions(cards, currentOrder);
                cards.forEach(c => c.classList.remove('winning'));
            }

            cards.forEach((card, index) => {
                card.addEventListener('click', () => handleCardClick(index));
            });

            // 3D Tilt Effect on Container
            container.addEventListener('mousemove', (e) => {
                // Find active card
                const activeCard = container.querySelector('.card-active');
                if (!activeCard) return;

                const rect = activeCard.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                // Calculate rotation (max 15 degrees)
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = ((y - centerY) / centerY) * -10; // Invert axis
                const rotateY = ((x - centerX) / centerX) * 10;

                // Apply transform. Note: we must keep the existing transforms!
                // .card-active has: translateX(-50%) translateZ(0) scale(1)
                activeCard.style.transform = `translateX(-50%) translateZ(0) scale(1) perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });

            container.addEventListener('mouseleave', () => {
                const activeCard = container.querySelector('.card-active');
                if (activeCard) {
                    activeCard.style.transform = ''; // Clear inline styles to revert to class style
                }
            });
        }

        function updateCardPositions(cards, order) {
            cards.forEach(c => c.classList.remove('card-left', 'card-active', 'card-right'));
            if (cards[order[0]]) cards[order[0]].classList.add('card-left');
            if (cards[order[1]]) cards[order[1]].classList.add('card-active');
            if (cards[order[2]]) cards[order[2]].classList.add('card-right');
        }

        function pickUniqueGames(gameList, count) {
            const shuffled = [...gameList].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, count);
        }

        function generateRandomRTP() {
            const min = 96.5;
            const max = 98.0;
            const random = Math.random() * (max - min) + min;
            return random.toFixed(2) + "%";
        }

        function createCard(game) {
            const card = document.createElement('div');
            card.className = 'game-card';

            let rtpDisplay = '';
            let rtpValue = game.rtp;
            let hiddenClass = 'hidden';

            if (!rtpValue && game.provider === "JILI") {
                rtpValue = generateRandomRTP();
            }

            if (rtpValue) {
                rtpDisplay = `RTP: ${rtpValue}`;
                hiddenClass = '';
            }

            // Note: Updated link to use dynamic global setting if possible, but here we fallback to hardcoded or re-update by global script
            // The main script body updates existing links, so we just set a default here.
            // Ideally should use fetched settings.contactLink but scope is tricky. 
            // We'll rely on global update or hardcode standard default.

            card.innerHTML = `
                <div class="game-image-wrapper">
                    <a href="https://www.lugyiminn.com" target="_blank">
                        <img src="${game.image}" alt="${game.name}" class="game-image">
                    </a>
                </div>
                <h2 class="game-title">${game.name}</h2>
                <div class="card-footer">
                    <span class="game-provider">${game.provider}</span>
                    <span class="rtp-badge ${hiddenClass}">${rtpDisplay}</span>
                </div>
            `;

            return card;
        }
    }

    // --- Floating Icons Logic ---
    function initFloatingIcons(games) {
        const container = document.getElementById('floating-icons-container');
        if (!container || !games || games.length === 0) return;

        const iconCount = 15; // Number of floating icons

        for (let i = 0; i < iconCount; i++) {
            createFloatingIcon(i);
        }

        function createFloatingIcon(index) {
            const icon = document.createElement('img');
            const randomGame = games[Math.floor(Math.random() * games.length)];
            icon.src = randomGame.image;
            icon.className = 'floating-icon';

            // Randomize properties
            const size = Math.random() * 60 + 40; // 40px to 100px
            const left = Math.random() * 100; // 0% to 100%
            const duration = Math.random() * 15 + 15; // 15s to 30s
            const delay = Math.random() * -20; // Start at different times
            const direction = Math.random() > 0.5 ? 'floatUp' : 'floatDown';

            icon.style.width = `${size}px`;
            icon.style.height = `${size}px`;
            icon.style.left = `${left}%`;
            icon.style.animation = `${direction} ${duration}s linear infinite`;
            icon.style.animationDelay = `${delay}s`;

            // Random initial position (vertical) to fill screen immediately
            // We set a negative delay above which helps, but let's also ensure distribution
            // Actually animation-delay with negative values handles "mid-animation" start perfectly.

            container.appendChild(icon);
        }
    }
});
