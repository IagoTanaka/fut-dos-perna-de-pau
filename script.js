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
            { x: 700, y: 100, name: 'B1', team: 'team-b', role: 'forward' },
            { x: 650, y: 200, name: 'B2', team: 'team-b', role: 'midfielder' },
            { x: 650, y: 300, name: 'B3', team: 'team-b', role: 'midfielder' },
            { x: 600, y: 250, name: 'B4', team: 'team-b', role: 'defender' },
            { x: 750, y: 250, name: 'GB', team: 'team-b', isGoalkeeper: true }
        ];
        
        [...teamA, ...teamB].forEach(p => createPlayer(p));
        gameState.controlledPlayer = gameState.players.find(p => p.name === 'A1');
    }
    
    function createPlayer({x, y, name, team, isGoalkeeper = false, role = 'field'}) {
        const element = document.createElement('div');
        element.className = `player ${team} ${isGoalkeeper ? 'goalkeeper' : ''}`;
        element.textContent = name;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        field.appendChild(element);
        
        const player = {
            element, x, y, name, team, isGoalkeeper, role,
            targetX: x, targetY: y
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
                // Passa para o jogador mais avançado
                const bestTarget = teammates.reduce((best, current) => 
                    (current.x < best.x) ? current : best
                );
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
        
        // Determina se estão atacando
        const isAttacking = gameState.ball.x < 500 || 
                          (gameState.ballOwner && gameState.players.find(p => p.name === gameState.ballOwner).team === 'team-b');
        
        // Encontra o jogador mais próximo da bola
        const closestToBall = [...teamBPlayers]
            .filter(p => !p.isGoalkeeper)
            .sort((a, b) => distanceToBall(a) - distanceToBall(b))[0];
        
        // Atualiza cada jogador
        teamBPlayers.forEach(player => {
            if (player.isGoalkeeper) {
                updateGoalkeeperAI(player);
            } else {
                updateFieldPlayerAI(player, closestToBall === player, isAttacking);
            }
            
            // Move o jogador
            const dx = player.targetX - player.x;
            const dy = player.targetY - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 2) {
                player.x += (dx / distance) * config.aiSpeed;
                player.y += (dy / distance) * config.aiSpeed;
            }
            
            // Limites do campo
            player.x = Math.max(50, Math.min(790, player.x));
            player.y = Math.max(50, Math.min(450, player.y));
            
            updatePlayerPosition(player);
        });
        
        // Tomada de decisão quando tem a bola
        if (gameState.aiDecisionCounter >= config.aiDecisionInterval && 
            gameState.ballOwner && teamBPlayers.some(p => p.name === gameState.ballOwner)) {
            
            gameState.aiDecisionCounter = 0;
            const playerWithBall = teamBPlayers.find(p => p.name === gameState.ballOwner);
            
            // Chance de chutar baseada na distância do gol
            const distToGoal = playerWithBall.x;
            const shootChance = 0.4 + (0.4 * (1 - distToGoal/800));
            
            if (Math.random() < shootChance) {
                kickBall(playerWithBall, false);
            } else {
                // Passa para um companheiro à frente
                const forwardPlayers = teamBPlayers.filter(p => 
                    !p.isGoalkeeper && 
                    p.name !== playerWithBall.name &&
                    p.x < playerWithBall.x
                );
                
                if (forwardPlayers.length > 0) {
                    const receiver = forwardPlayers[Math.floor(Math.random() * forwardPlayers.length)];
                    kickBall(playerWithBall, true);
                } else {
                    // Avança com a bola
                    playerWithBall.targetX = Math.max(100, playerWithBall.x - 50);
                }
            }
        }
    }
    
    function updateGoalkeeperAI(player) {
        if (gameState.ballOwner && gameState.players.find(p => p.name === gameState.ballOwner).team === 'team-a') {
            player.targetX = 720;
            player.targetY = Math.max(210, Math.min(290, gameState.ball.y));
        } else {
            player.targetX = 750;
            player.targetY = 250;
        }
    }
    
    function updateFieldPlayerAI(player, isChaser, isAttacking) {
        const ballOwner = gameState.ballOwner ? 
            gameState.players.find(p => p.name === gameState.ballOwner) : null;
        
        // Se é o dono da bola
        if (gameState.ballOwner === player.name) {
            player.targetX = Math.max(100, player.x - 30);
            return;
        }
        
        // Se é o perseguidor principal
        if (isChaser) {
            if (ballOwner && ballOwner.team === 'team-b') {
                // Companheiro tem a bola - se posiciona para receber passe
                const angle = Math.random() * Math.PI * 2;
                const distance = 80 + Math.random() * 40;
                player.targetX = ballOwner.x + Math.cos(angle) * distance;
                player.targetY = ballOwner.y + Math.sin(angle) * distance;
            } else if (!gameState.ballOwner) {
                // Bola livre - persegue
                player.targetX = gameState.ball.x;
                player.targetY = gameState.ball.y;
            } else {
                // Time azul tem a bola - pressiona
                player.targetX = gameState.ball.x + 30;
                player.targetY = gameState.ball.y;
            }
            return;
        }
        
        // Posicionamento baseado no papel do jogador e estado do jogo
        if (isAttacking) {
            // Formação ofensiva
            switch(player.role) {
                case 'forward':
                    player.targetX = 200 + Math.random() * 100;
                    player.targetY = 100 + Math.random() * 300;
                    break;
                case 'midfielder':
                    player.targetX = 350 + Math.random() * 100;
                    player.targetY = 150 + Math.random() * 200;
                    break;
                case 'defender':
                    player.targetX = 450 + Math.random() * 100;
                    player.targetY = 200 + Math.random() * 100;
                    break;
            }
        } else {
            // Formação defensiva
            switch(player.role) {
                case 'forward':
                    player.targetX = 500 + Math.random() * 100;
                    player.targetY = 150 + Math.random() * 200;
                    break;
                case 'midfielder':
                    player.targetX = 550 + Math.random() * 100;
                    player.targetY = 100 + Math.random() * 300;
                    break;
                case 'defender':
                    player.targetX = 600 + Math.random() * 100;
                    player.targetY = 200 + Math.random() * 100;
                    break;
            }
        }
    }
    
    function distanceToBall(player) {
        const dx = player.x - gameState.ball.x;
        const dy = player.y - gameState.ball.y;
        return Math.sqrt(dx * dx + dy * dy);
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