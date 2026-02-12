const CORRECT_PASSWORD = import.meta.env.VITE_PASSWORD;

const LOGIN_UI = {
    screen: document.getElementById('login-screen'),
    input: document.getElementById('password-input'),
    btn: document.getElementById('submit-password'),
    error: document.getElementById('error-msg'),
    mainCard: document.getElementById('main-card') // The element we want to show
};

function checkPassword() {
    if (LOGIN_UI.input.value === CORRECT_PASSWORD) {
        // Hide login, show main card
        LOGIN_UI.screen.classList.add('hidden');
        LOGIN_UI.mainCard.classList.remove('hidden');
    } else {
        // Show error and shake
        LOGIN_UI.error.style.display = 'block';
        LOGIN_UI.input.value = '';
        LOGIN_UI.input.focus();

        // Simple shake animation
        LOGIN_UI.screen.animate([
            { transform: 'translate(-50%, -50%) translateX(0px)' },
            { transform: 'translate(-50%, -50%) translateX(-10px)' },
            { transform: 'translate(-50%, -50%) translateX(10px)' },
            { transform: 'translate(-50%, -50%) translateX(0px)' }
        ], { duration: 300 });
    }
}

// Event Listeners for Password
LOGIN_UI.btn.addEventListener('click', checkPassword);
LOGIN_UI.input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkPassword();
});

const ELEMENTS = {
    yesBtn: document.getElementById('yesBtn'),
    noBtn: document.getElementById('noBtn'),
    card: document.getElementById('main-card'),
    success: document.getElementById('success-message'),
};

let physicsStarted = false;
let runAwayActive = false;
let swarmActive = false;
let swapCount = 0;
let extraScale = 1.0;
let mouseX = 0, mouseY = 0;

let engine, world;
let noBody;
let rainBodies = [];
let rainElements = [];

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

ELEMENTS.yesBtn.addEventListener('click', win);
ELEMENTS.noBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!physicsStarted) startPhysics();
    else handleNoClick();
});

function handleNoClick() {
    swapCount++;
    // runAwayActive = false;

    if (swapCount >= 6) {
        ELEMENTS.noBtn.innerText = "RAHHH!";
        cloneAndEnlargeEverything();
    }
    else if (swapCount >= 3) {
        swarmActive = true;
        const swarmTaunts = ["Just say yes!!", "STOP TRYING.", "I think you hate me :("];
        ELEMENTS.noBtn.innerText = swarmTaunts[swapCount % swarmTaunts.length];
    }
    else {
        const taunts = ["Nope!!!!!", "WHY'D YOU CLICK ME :(", "Please say yesss :("];
        ELEMENTS.noBtn.innerText = taunts[Math.floor(Math.random() * taunts.length)];
    }

    swapNoWithRandomYes();
}

// --- FIX: Only swap with buttons currently on screen ---
function swapNoWithRandomYes() {
    if (!noBody || rainBodies.length === 0) return;

    // Filter for buttons that are roughly within the window height
    const visibleButtons = rainBodies.filter(b => b.position.y > 0 && b.position.y < window.innerHeight);

    // If we can't find a visible one, just use any, but visible is better
    const sourceList = visibleButtons.length > 0 ? visibleButtons : rainBodies;
    const randomYesBody = sourceList[Math.floor(Math.random() * sourceList.length)];

    const noPos = { x: noBody.position.x, y: noBody.position.y };
    const yesPos = { x: randomYesBody.position.x, y: randomYesBody.position.y };

    Matter.Body.setPosition(noBody, yesPos);
    Matter.Body.setPosition(randomYesBody, noPos);
    Matter.Body.setVelocity(noBody, { x: 0, y: 0 });
    Matter.Body.setVelocity(randomYesBody, { x: 0, y: 0 });
}

function cloneAndEnlargeEverything() {
    extraScale += 0.2;
    for (let i = 0; i < 15; i++) addYesButton(extraScale);
}

function win() {
    ELEMENTS.success.style.display = 'block';
    ELEMENTS.card.style.opacity = '0';
    if (engine) engine.world.gravity.y = -0.5;
}

function startPhysics() {
    physicsStarted = true;
    runAwayActive = true;

    const { Engine, Bodies, Composite, Body } = Matter;
    engine = Engine.create();
    world = engine.world;

    // Reduced gravity slightly for stability during lag
    engine.world.gravity.y = 2.0;

    const yesRect = ELEMENTS.yesBtn.getBoundingClientRect();
    const noRect = ELEMENTS.noBtn.getBoundingClientRect();
    ELEMENTS.card.classList.add('fade-out');

    [ELEMENTS.yesBtn, ELEMENTS.noBtn].forEach(btn => {
        document.body.appendChild(btn);
        btn.style.position = 'absolute';
        btn.style.left = '0';
        btn.style.top = '0';
        // Hide them until the first frame to stop top-left flickering
        btn.style.visibility = 'hidden';
    });

    const yesBody = Bodies.rectangle(yesRect.left + yesRect.width/2, yesRect.top + yesRect.height/2, yesRect.width, yesRect.height, { restitution: 0.5 });
    noBody = Bodies.rectangle(noRect.left + noRect.width/2, noRect.top + noRect.height/2, noRect.width, noRect.height, { restitution: 0.5 });

    const wallT = 1000;
    const ground = Bodies.rectangle(window.innerWidth/2, window.innerHeight + wallT/2, window.innerWidth * 5, wallT, { isStatic: true });
    const leftWall = Bodies.rectangle(-wallT/2, window.innerHeight/2, wallT, window.innerHeight * 5, { isStatic: true });
    const rightWall = Bodies.rectangle(window.innerWidth + wallT/2, window.innerHeight/2, wallT, window.innerHeight * 5, { isStatic: true });

    Composite.add(world, [yesBody, noBody, ground, leftWall, rightWall]);

    let spawned = 0;
    const spawnInterval = setInterval(() => {
        addYesButton(1.0);
        spawned++;
        if (spawned >= 60) clearInterval(spawnInterval);
    }, 50);

    function update() {
        // Fixed delta helps stability when battery is low/laggy
        Engine.update(engine, 1000 / 60);

        syncElement(ELEMENTS.yesBtn, yesBody);
        syncElement(ELEMENTS.noBtn, noBody);

        if (runAwayActive) applyRunawayForce(noBody);

        rainBodies.forEach((body, i) => {
            // --- ANTI-ABYSS: If it falls through the floor, put it back at the top ---
            if (body.position.y > window.innerHeight + 200) {
                Body.setPosition(body, { x: Math.random() * window.innerWidth, y: -200 });
                Body.setVelocity(body, { x: 0, y: 10 });
            }

            if (swarmActive) applyAttractionForce(body);
            syncElement(rainElements[i], body);
        });

        requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function addYesButton(scaleMultiplier) {
    const btn = document.createElement('button');
    btn.className = 'btn yes-btn';
    btn.innerText = 'YES';
    btn.style.visibility = 'hidden';

    const scale = (0.7 + Math.random() * 0.4) * scaleMultiplier;
    btn.dataset.scale = scale;
    btn.addEventListener('click', win);
    document.body.appendChild(btn);
    rainElements.push(btn);

    const body = Matter.Bodies.rectangle(
        Math.random() * window.innerWidth,
        -400 - (Math.random() * 500),
        80 * scale, 35 * scale,
        { restitution: 0.4, frictionAir: 0.008 }
    );

    // Lower initial speed for more stability
    Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 2, y: 10 });
    Matter.Composite.add(world, body);
    rainBodies.push(body);
}

function syncElement(el, body) {
    el.style.visibility = 'visible'; // Reveal once synced
    const x = body.position.x - el.offsetWidth / 2;
    const y = body.position.y - el.offsetHeight / 2;
    const scale = el.dataset.scale || 1;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${body.angle}rad) scale(${scale})`;
}

function applyRunawayForce(body) {
    const dx = mouseX - body.position.x;
    const dy = mouseY - body.position.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < 150) {
        const force = 0.05 * body.mass;
        Matter.Body.applyForce(body, body.position, { x: -(dx/dist)*force, y: -(dy/dist)*force });
    }
}

function applyAttractionForce(body) {
    const dx = mouseX - body.position.x;
    const dy = mouseY - body.position.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > 20) {
        const force = 0.0025 * body.mass;
        Matter.Body.applyForce(body, body.position, { x: (dx/dist)*force, y: (dy/dist)*force });
    }
}