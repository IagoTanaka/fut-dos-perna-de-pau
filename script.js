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
        aiDecisionInterval: 30,
        playerRadius: 20,
        ballRadius: 10
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
        // Time A (azul - esquerda) - Formação mais espalhada
        const teamA = [
            { x: 100, y: 100, name: 'A1', team: 'team-a', role: 'forward' },
            { x: 150, y: 175, name: 'A2', team: 'team-a', role: 'midfielder' },
            { x: 150, y: 325, name: 'A3', team: 'team-a', role: 'midfielder' },
            { x: 200, y: 250, name: 'A4', team: 'team-a', role: 'defender' },
            { x: 50, y: 250, name: 'GA', team: 'team-a', isGoalkeeper: true }
        ];
        
        // Time B (vermelho - direita) - Formação mais espalhada
        const teamB = [
            { x: 700, y: 100, name: 'B1', team: 'team-b', role: 'forward' },
            { x: 650, y: 175, name: 'B2', team: 'team-b', role: 'midfielder' },
            { x: 650, y: 325, name: 'B3', team: 'team-b', role: 'midfielder' },
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
            targetX: x, targetY: y,
            moveTimer: 0,
            randomOffsetX: 0,
            randomOffsetY: 0
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
        ball.style.left = `${gameState.ball.x - config.ballRadius}px`;
        ball.style.top = `${gameState.ball.y - config.ballRadius}px`;
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
        player.element.style.left = `${player.x - config.playerRadius}px`;
        player.element.style.top = `${player.y - config.playerRadius}px`;
        
        if (gameState.ballOwner === player.name) {
            const angle = Math.atan2(player.y - gameState.ball.y, player.x - gameState.ball.x);
            gameState.ball.x = player.x - Math.cos(angle) * 15;
            gameState.ball.y = player.y - Math.sin(angle) * 15;
            updateBallPosition();
        }
    }
    
    function checkCollisions() {
        gameState.players.forEach(player => {
            const dx = player.x - gameState.ball.x;
            const dy = player.y - gameState.ball.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < config.playerRadius + config.ballRadius && !gameState.ballOwner && gameState.lastKicker !== player.name) {
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
            
            // Colisão com as bordas
            if (gameState.ball.x < config.ballRadius) {
                gameState.ball.x = config.ballRadius;
                gameState.ball.speedX = Math.abs(gameState.ball.speedX) * 0.8;
            }
            if (gameState.ball.x > 800 - config.ballRadius) {
                gameState.ball.x = 800 - config.ballRadius;
                gameState.ball.speedX = -Math.abs(gameState.ball.speedX) * 0.8;
            }
            if (gameState.ball.y < config.ballRadius) {
                gameState.ball.y = config.ballRadius;
                gameState.ball.speedY = Math.abs(gameState.ball.speedY) * 0.8;
            }
            if (gameState.ball.y > 500 - config.ballRadius) {
                gameState.ball.y = 500 - config.ballRadius;
                gameState.ball.speedY = -Math.abs(gameState.ball.speedY) * 0.8;
            }
            
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

    function updateTeamFormation() {
        const teamBPlayers = gameState.players.filter(p => p.team === 'team-b');
        const hasPossession = gameState.ballOwner && gameState.players.find(p => p.name === gameState.ballOwner).team === 'team-b';
        const ballInAttackingHalf = gameState.ball.x < 400;

        const formation = {
            attacking: {
                'B1': { x: 200, y: 100 },
                'B2': { x: 350, y: 150 },
                'B3': { x: 350, y: 350 },
                'B4': { x: 450, y: 250 }
            },
            defending: {
                'B1': { x: 550, y: 100 },
                'B2': { x: 600, y: 175 },
                'B3': { x: 600, y: 325 },
                'B4': { x: 650, y: 250 }
            }
        };

        const currentFormation = (hasPossession || ballInAttackingHalf) ? formation.attacking : formation.defending;

        teamBPlayers.forEach(player => {
            if (!player.isGoalkeeper && currentFormation[player.name]) {
                // Atualiza offsets aleatórios periodicamente para movimento mais natural
                if (player.moveTimer <= 0) {
                    player.randomOffsetX = Math.random() * 60 - 30;
                    player.randomOffsetY = Math.random() * 60 - 30;
                    player.moveTimer = 60 + Math.random() * 60;
                } else {
                    player.moveTimer--;
                }
                
                player.targetX = currentFormation[player.name].x + player.randomOffsetX;
                player.targetY = currentFormation[player.name].y + player.randomOffsetY;
            }
        });
    }

    function updateAI() {
        gameState.aiDecisionCounter++;
        const teamBPlayers = gameState.players.filter(p => p.team === 'team-b');
        const ballOwner = gameState.ballOwner ? gameState.players.find(p => p.name === gameState.ballOwner) : null;
        
        updateTeamFormation();
        
        // Encontra o jogador mais próximo da bola
        const activePlayer = [...teamBPlayers]
            .filter(p => !p.isGoalkeeper)
            .sort((a, b) => distanceToBall(a) - distanceToBall(b))[0];

        teamBPlayers.forEach(player => {
            if (player.isGoalkeeper) {
                updateGoalkeeperAI(player);
            } else if (player === activePlayer) {
                updateActivePlayerAI(player);
            }
            
            movePlayerTowardsTarget(player);
            keepPlayerInBounds(player);
            updatePlayerPosition(player);
        });

        if (gameState.aiDecisionCounter >= config.aiDecisionInterval && ballOwner && ballOwner.team === 'team-b') {
            gameState.aiDecisionCounter = 0;
            makeTeamDecision(ballOwner, teamBPlayers);
        }
    }

    function updateGoalkeeperAI(player) {
        // Goleiro se move na área pequena
        const targetY = Math.min(Math.max(gameState.ball.y, 200), 300);
        player.targetX = player.team === 'team-a' ? 50 : 750;
        player.targetY = targetY;
    }

    function updateActivePlayerAI(player) {
        if (gameState.ballOwner === player.name) {
            // Jogador com a bola avança ou passa
            const distToGoal = player.team === 'team-a' ? 800 - player.x : player.x;
            if (distToGoal < 300 && Math.random() < 0.3) {
                kickBall(player, false);
            } else {
                player.targetX = player.team === 'team-a' ? 
                    Math.min(700, player.x + 30) : 
                    Math.max(100, player.x - 30);
                player.targetY = gameState.ball.y;
            }
        } else if (!gameState.ballOwner) {
            // Jogador sem dono da bola vai atrás dela
            player.targetX = gameState.ball.x;
            player.targetY = gameState.ball.y;
        } else {
            // Posiciona-se estrategicamente
            player.targetX = gameState.ball.x + (player.team === 'team-a' ? 30 : -30);
            player.targetY = gameState.ball.y;
        }
    }

    function makeTeamDecision(playerWithBall, teammates) {
        const distToGoal = playerWithBall.team === 'team-a' ? 800 - playerWithBall.x : playerWithBall.x;
        const inShootingRange = distToGoal < 300;
        
        if (inShootingRange && Math.random() < 0.5) {
            kickBall(playerWithBall, false);
            return;
        }

        const passOptions = teammates.filter(p => 
            !p.isGoalkeeper && 
            p.name !== playerWithBall.name &&
            ((playerWithBall.team === 'team-a' && p.x > playerWithBall.x - 100) || 
             (playerWithBall.team === 'team-b' && p.x < playerWithBall.x + 100)) &&
            Math.abs(p.y - playerWithBall.y) < 200
        );

        if (passOptions.length > 0 && Math.random() < 0.7) {
            const bestReceiver = passOptions.reduce((best, current) => 
                (playerWithBall.team === 'team-a' ? current.x > best.x : current.x < best.x) ? current : best
            );
            kickBall(playerWithBall, true);
        } else {
            // Avança com a bola
            playerWithBall.targetX = playerWithBall.team === 'team-a' ? 
                Math.min(700, playerWithBall.x + 40) : 
                Math.max(100, playerWithBall.x - 40);
        }
    }

    function movePlayerTowardsTarget(player) {
        const dx = player.targetX - player.x;
        const dy = player.targetY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) {
            const speed = (player === gameState.controlledPlayer) ? config.playerSpeed : config.aiSpeed;
            player.x += (dx / distance) * speed;
            player.y += (dy / distance) * speed;
        }
    }

    function keepPlayerInBounds(player) {
        const minX = player.isGoalkeeper ? (player.team === 'team-a' ? 20 : 720) : 20;
        const maxX = player.isGoalkeeper ? (player.team === 'team-a' ? 80 : 780) : 780;
        
        player.x = Math.max(minX, Math.min(maxX, player.x));
        player.y = Math.max(20, Math.min(480, player.y));
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