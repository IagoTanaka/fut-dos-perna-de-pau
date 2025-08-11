document.addEventListener('DOMContentLoaded', function() {
    const field = document.querySelector('.field');
    const ball = document.getElementById('ball');
    const leftScore = document.querySelector('.left-score');
    const rightScore = document.querySelector('.right-score');
    
    // Configurações do jogo
    const config = {
        playerSpeed: 3,
        aiSpeed: 2.5,
        kickPower: 10,
        goalkeeperPower: 15,
        passPower: 8,
        friction: 0.98,
        minSpeed: 0.1,
        aiDecisionInterval: 30
    };
    
    // Estado do jogo
    const gameState = {
        ball: { x: 400, y: 250, speedX: 0, speedY: 0 },
        ballOwner: null,
        lastKicker: null,
        scores: { left: 0, right: 0 },
        controlledPlayer: null,
        players: [],
        aiDecisionCounter: 0
    };
    
    // Inicialização do jogo
    initGame();
    
    function initGame() {
        createPlayers();
        resetBall();
        setupControls();
        gameLoop();
    }
    
    function createPlayers() {
        // Time A (azul - esquerda)
        const teamA = [
            { x: 100, y: 100, name: 'A1', team: 'team-a' },
            { x: 150, y: 200, name: 'A2', team: 'team-a' },
            { x: 150, y: 300, name: 'A3', team: 'team-a' },
            { x: 200, y: 250, name: 'A4', team: 'team-a' },
            { x: 50, y: 250, name: 'GA', team: 'team-a', isGoalkeeper: true }
        ];
        
        // Time B (vermelho - direita)
        const teamB = [
            { x: 700, y: 100, name: 'B1', team: 'team-b' },
            { x: 650, y: 200, name: 'B2', team: 'team-b' },
            { x: 650, y: 300, name: 'B3', team: 'team-b' },
            { x: 600, y: 250, name: 'B4', team: 'team-b' },
            { x: 750, y: 250, name: 'GB', team: 'team-b', isGoalkeeper: true }
        ];
        
        [...teamA, ...teamB].forEach(p => createPlayer(p));
        gameState.controlledPlayer = gameState.players.find(p => p.name === 'A1');
    }
    
    function createPlayer({x, y, name, team, isGoalkeeper = false}) {
        const element = document.createElement('div');
        element.className = `player ${team} ${isGoalkeeper ? 'goalkeeper' : ''}`;
        element.textContent = name;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        field.appendChild(element);
        
        const player = {
            element, x, y, name, team, isGoalkeeper,
            targetX: x, targetY: y, isAttacking: false
        };
        
        gameState.players.push(player);
        return player;
    }
    
    function resetBall() {
        gameState.ball = { x: 400, y: 250, speedX: 0, speedY: 0 };
        gameState.ballOwner = null;
        updateBallPosition();
    }
    
    function updateBallPosition() {
        ball.style.left = `${gameState.ball.x}px`;
        ball.style.top = `${gameState.ball.y}px`;
    }
    
    function setupControls() {
        document.addEventListener('keydown', handleKeyDown);
    }
    
    function handleKeyDown(e) {
        if (!gameState.controlledPlayer) return;
        
        const key = e.key.toLowerCase();
        const player = gameState.controlledPlayer;
        
        if (key === 'a') player.x = Math.max(10, player.x - config.playerSpeed);
        if (key === 'd') player.x = Math.min(790, player.x + config.playerSpeed);
        if (key === 'w') player.y = Math.max(10, player.y - config.playerSpeed);
        if (key === 's') player.y = Math.min(490, player.y + config.playerSpeed);
        
        if (gameState.ballOwner === player.name) {
            if (key === 'm') kickBall(player, true);
            if (key === 'j') kickBall(player, false);
        }
        
        updatePlayerPosition(player);
    }
    
    function kickBall(player, isPass) {
        let targetX, targetY;
        const power = player.isGoalkeeper ? config.goalkeeperPower : 
                      isPass ? config.passPower : config.kickPower;
        
        if (isPass) {
            const teammates = gameState.players.filter(p => 
                p.team === player.team && p.name !== player.name);
            
            if (teammates.length > 0) {
                const bestTarget = teammates.reduce((best, current) => {
                    const bestScore = calculatePassScore(player, best);
                    const currentScore = calculatePassScore(player, current);
                    return currentScore > bestScore ? current : best;
                }, teammates[0]);
                
                targetX = bestTarget.x;
                targetY = bestTarget.y;
            } else {
                targetX = player.team === 'team-a' ? 800 : 0;
                targetY = 250;
            }
        } else {
            targetX = player.team === 'team-a' ? 800 : 0;
            targetY = 250 + (Math.random() * 80 - 40);
        }
        
        const dx = targetX - player.x;
        const dy = targetY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        gameState.ball.speedX = (dx / distance) * power;
        gameState.ball.speedY = (dy / distance) * power;
        gameState.ballOwner = null;
        gameState.lastKicker = player.name;
    }
    
    function calculatePassScore(from, to) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const forwardScore = from.team === 'team-a' ? dx : -dx;
        const distanceScore = -Math.abs(distance - 150) / 50;
        const backPenalty = forwardScore < 0 ? -50 : 0;
        return forwardScore * 0.7 + distanceScore * 0.3 + backPenalty;
    }
    
    function updatePlayerPosition(player) {
        player.element.style.left = `${player.x}px`;
        player.element.style.top = `${player.y}px`;
        
        if (gameState.ballOwner === player.name) {
            const angle = Math.atan2(player.y - gameState.ball.y, player.x - gameState.ball.x);
            gameState.ball.x = player.x - Math.cos(angle) * 15;
            gameState.ball.y = player.y - Math.sin(angle) * 15;
        }
    }
    
    function checkCollisions() {
        gameState.players.forEach(player => {
            const dx = player.x - gameState.ball.x;
            const dy = player.y - gameState.ball.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 20 && !gameState.ballOwner && gameState.lastKicker !== player.name) {
                gameState.ballOwner = player.name;
                gameState.ball.speedX = 0;
                gameState.ball.speedY = 0;
                
                if (player.team === 'team-a') {
                    gameState.controlledPlayer = player;
                }
            }
        });
    }
    
    function updateBallPhysics() {
        if (gameState.ballOwner) {
            const owner = gameState.players.find(p => p.name === gameState.ballOwner);
            if (owner) {
                const angle = Math.atan2(owner.y - gameState.ball.y, owner.x - gameState.ball.x);
                gameState.ball.x = owner.x - Math.cos(angle) * 15;
                gameState.ball.y = owner.y - Math.sin(angle) * 15;
            }
        } else {
            gameState.ball.x += gameState.ball.speedX;
            gameState.ball.y += gameState.ball.speedY;
            
            gameState.ball.speedX *= config.friction;
            gameState.ball.speedY *= config.friction;
            
            if (gameState.ball.x < 10) gameState.ball.speedX = Math.abs(gameState.ball.speedX) * 0.8;
            if (gameState.ball.x > 790) gameState.ball.speedX = -Math.abs(gameState.ball.speedX) * 0.8;
            if (gameState.ball.y < 10) gameState.ball.speedY = Math.abs(gameState.ball.speedY) * 0.8;
            if (gameState.ball.y > 490) gameState.ball.speedY = -Math.abs(gameState.ball.speedY) * 0.8;
            
            if (Math.abs(gameState.ball.speedX) < config.minSpeed) gameState.ball.speedX = 0;
            if (Math.abs(gameState.ball.speedY) < config.minSpeed) gameState.ball.speedY = 0;
        }
    }
    
    function checkGoals() {
        if (gameState.ball.x < 10 && gameState.ball.y > 210 && gameState.ball.y < 290) {
            gameState.scores.right++;
            rightScore.textContent = gameState.scores.right;
            resetBall();
        }
        
        if (gameState.ball.x > 790 && gameState.ball.y > 210 && gameState.ball.y < 290) {
            gameState.scores.left++;
            leftScore.textContent = gameState.scores.left;
            resetBall();
        }
    }
    
    function updateAI() {
        gameState.aiDecisionCounter++;
        const teamBPlayers = gameState.players.filter(p => p.team === 'team-b');
        const teamAPlayers = gameState.players.filter(p => p.team === 'team-a');
        
        // Encontra o jogador mais próximo da bola
        const closestToBall = [...teamBPlayers]
            .filter(p => !p.isGoalkeeper)
            .sort((a, b) => distanceToBall(a) - distanceToBall(b))[0];
        
        teamBPlayers.forEach(player => {
            if (player.isGoalkeeper) {
                updateGoalkeeperAI(player);
            } else {
                updateFieldPlayerAI(player, closestToBall === player);
            }
            
            // Limites do campo
            player.x = Math.max(400, Math.min(790, player.x));
            player.y = Math.max(50, Math.min(450, player.y));
            updatePlayerPosition(player);
        });
        
        // Tomada de decisão do time B
        if (gameState.aiDecisionCounter >= config.aiDecisionInterval && 
            gameState.ballOwner && teamBPlayers.some(p => p.name === gameState.ballOwner)) {
            
            gameState.aiDecisionCounter = 0;
            const playerWithBall = teamBPlayers.find(p => p.name === gameState.ballOwner);
            
            // Chance de chutar aumenta conforme se aproxima do gol
            const distToGoal = playerWithBall.x;
            const shootChance = 0.3 + (0.5 * (1 - distToGoal/800));
            
            if (Math.random() < shootChance) {
                // Chuta para o gol com variação
                kickBall(playerWithBall, false);
            } else {
                // Passa para um companheiro
                const validReceivers = teamBPlayers.filter(p => 
                    !p.isGoalkeeper && 
                    p.name !== playerWithBall.name &&
                    distanceBetween(playerWithBall, p) < 300
                );
                
                if (validReceivers.length > 0) {
                    const receiver = validReceivers[Math.floor(Math.random() * validReceivers.length)];
                    kickBall(playerWithBall, true);
                }
            }
        }
    }
    
    function distanceToBall(player) {
        const dx = player.x - gameState.ball.x;
        const dy = player.y - gameState.ball.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    function distanceBetween(player1, player2) {
        const dx = player1.x - player2.x;
        const dy = player1.y - player2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    function updateGoalkeeperAI(player) {
        if (gameState.ballOwner && gameState.players.find(p => p.name === gameState.ballOwner).team === 'team-a') {
            player.targetX = 720;
            player.targetY = Math.max(210, Math.min(290, gameState.ball.y));
        } else {
            player.targetX = 750;
            player.targetY = 250;
        }
        moveTowardsTarget(player, config.aiSpeed);
    }
    
    function updateFieldPlayerAI(player, isClosestToBall) {
        if (gameState.ballOwner === player.name) {
            // Tem a bola - avança para o gol
            player.targetX = 100 + (Math.random() * 50 - 25);
            player.targetY = 250 + (Math.random() * 100 - 50);
        } else if (isClosestToBall && !gameState.ballOwner) {
            // É o mais próximo da bola livre - vai buscá-la
            player.targetX = gameState.ball.x;
            player.targetY = gameState.ball.y;
        } else if (gameState.ballOwner) {
            if (gameState.players.find(p => p.name === gameState.ballOwner).team === 'team-b') {
                // Companheiro tem a bola - se posiciona para receber passe
                const angle = Math.random() * Math.PI * 2;
                const distance = 80 + Math.random() * 40;
                player.targetX = gameState.ball.x + Math.cos(angle) * distance;
                player.targetY = gameState.ball.y + Math.sin(angle) * distance;
            } else {
                // Time azul tem a bola - marcação
                const closestOpponent = [...gameState.players]
                    .filter(p => p.team === 'team-a' && !p.isGoalkeeper)
                    .sort((a, b) => distanceBetween(player, a) - distanceBetween(player, b))[0];
                
                if (closestOpponent) {
                    player.targetX = closestOpponent.x + (Math.random() * 40 - 20);
                    player.targetY = closestOpponent.y + (Math.random() * 40 - 20);
                }
            }
        } else {
            // Posicionamento padrão
            player.targetX = 500 + Math.random() * 200;
            player.targetY = 100 + Math.random() * 300;
        }
        
        moveTowardsTarget(player, config.aiSpeed);
    }
    
    function moveTowardsTarget(player, speed) {
        const dx = player.targetX - player.x;
        const dy = player.targetY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) {
            player.x += (dx / distance) * speed;
            player.y += (dy / distance) * speed;
        }
    }
    
    function gameLoop() {
        checkCollisions();
        updateBallPhysics();
        checkGoals();
        updateBallPosition();
        updateAI();
        requestAnimationFrame(gameLoop);
    }
});