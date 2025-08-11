document.addEventListener('DOMContentLoaded', function() {
    const field = document.querySelector('.field');
    const ball = document.getElementById('ball');
    const leftScore = document.querySelector('.left-score');
    const rightScore = document.querySelector('.right-score');
    
    // Configurações do jogo
    const config = {
        playerSpeed: 3,
        aiSpeed: 2,
        kickPower: 10,
        goalkeeperPower: 15,
        passPower: 8,
        friction: 0.98,
        minSpeed: 0.1,
        aiDecisionInterval: 60
    };
    
    // Estado do jogo
    const gameState = {
        ball: { x: 400, y: 250, speedX: 0, speedY: 0 },
        ballOwner: null,
        lastKicker: null,
        scores: { left: 0, right: 0 },
        controlledPlayer: null,
        players: [],
        aiDecisionCounter: 0,
        chasingPlayer: null
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
            targetX: x, targetY: y, role: 'default'
        };
        
        gameState.players.push(player);
        return player;
    }
    
    function resetBall() {
        gameState.ball = { x: 400, y: 250, speedX: 0, speedY: 0 };
        gameState.ballOwner = null;
        gameState.chasingPlayer = null;
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
                
                // Atualiza o jogador que está perseguindo a bola
                if (player.team === 'team-b' && !gameState.chasingPlayer) {
                    gameState.chasingPlayer = player;
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

        // Sistema de perseguição dinâmica
        if (!gameState.ballOwner || gameState.players.find(p => p.name === gameState.ballOwner).team === 'team-a') {
            // Atualiza perseguidor apenas se a bola estiver livre ou com o time azul
            const closestPlayer = [...teamBPlayers]
                .filter(p => !p.isGoalkeeper)
                .sort((a, b) => distanceToBall(a) - distanceToBall(b))[0];
            
            if (!gameState.chasingPlayer || closestPlayer !== gameState.chasingPlayer) {
                gameState.chasingPlayer = closestPlayer;
            }
        }

        teamBPlayers.forEach(player => {
            if (player.isGoalkeeper) {
                updateGoalkeeperAI(player);
            } else if (player === gameState.chasingPlayer) {
                updateChasingPlayerAI(player);
            } else {
                updatePositioningPlayerAI(player);
            }

            // Limites do campo
            player.x = Math.max(400, Math.min(790, player.x));
            player.y = Math.max(50, Math.min(450, player.y));
            updatePlayerPosition(player);
        });

        // Lógica de decisão ofensiva
        if (gameState.aiDecisionCounter >= config.aiDecisionInterval) {
            gameState.aiDecisionCounter = 0;
            
            if (gameState.ballOwner && teamBPlayers.some(p => p.name === gameState.ballOwner)) {
                const playerWithBall = teamBPlayers.find(p => p.name === gameState.ballOwner);
                const distToGoal = Math.abs(playerWithBall.x);
                const inShootingRange = distToGoal < 300;
                
                // Chance de 80% de chutar se estiver perto do gol
                if (inShootingRange && Math.random() < 0.8) {
                    kickBall(playerWithBall, false);
                } 
                // Chance de 60% de passar se houver companheiros mais avançados
                else {
                    const advancedPlayers = teamBPlayers.filter(p => 
                        !p.isGoalkeeper && 
                        p.name !== playerWithBall.name &&
                        p.x < playerWithBall.x
                    );
                    
                    if (advancedPlayers.length > 0 && Math.random() < 0.6) {
                        // Passa para o jogador mais avançado ou mais bem posicionado
                        const bestReceiver = advancedPlayers.reduce((best, current) => {
                            const bestScore = calculatePositionScore(playerWithBall, best);
                            const currentScore = calculatePositionScore(playerWithBall, current);
                            return currentScore > bestScore ? current : best;
                        }, advancedPlayers[0]);
                        
                        kickBall(playerWithBall, true);
                    } else {
                        // Avança com a bola
                        playerWithBall.targetX = 100;
                        playerWithBall.targetY = 250;
                    }
                }
            }
        }
    }

    function calculatePositionScore(from, to) {
        // Calcula quão bem posicionado está o jogador para receber um passe
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Prefere jogadores mais avançados (mais perto do gol azul)
        const positionScore = (800 - to.x) * 0.7;
        
        // Prefere passes médios (nem muito curtos nem muito longos)
        const distanceScore = -Math.abs(distance - 200) * 0.3;
        
        // Bônus se estiver livre de marcadores
        const defenderDistance = getClosestDefenderDistance(to);
        const freedomScore = defenderDistance > 50 ? 30 : 0;
        
        return positionScore + distanceScore + freedomScore;
    }

    function getClosestDefenderDistance(player) {
        const defenders = gameState.players.filter(p => p.team === 'team-a' && !p.isGoalkeeper);
        if (defenders.length === 0) return 100;
        
        const distances = defenders.map(defender => {
            const dx = defender.x - player.x;
            const dy = defender.y - player.y;
            return Math.sqrt(dx * dx + dy * dy);
        });
        
        return Math.min(...distances);
    }

    function updateChasingPlayerAI(player) {
        if (gameState.ballOwner === player.name) {
            // Tem a bola - avança para o gol com variação
            player.targetX = 100 + (Math.random() * 50 - 25);
            player.targetY = 250 + (Math.random() * 100 - 50);
        } else if (gameState.ballOwner) {
            if (gameState.players.find(p => p.name === gameState.ballOwner).team === 'team-b') {
                // Companheiro tem a bola - se posiciona para receber passe
                const angle = Math.random() * Math.PI * 2;
                const distance = 80 + Math.random() * 40;
                player.targetX = gameState.ball.x + Math.cos(angle) * distance;
                player.targetY = gameState.ball.y + Math.sin(angle) * distance;
            } else {
                // Time azul tem a bola - pressiona
                player.targetX = gameState.ball.x + 30;
                player.targetY = gameState.ball.y;
            }
        } else {
            // Bola livre - persegue
            player.targetX = gameState.ball.x;
            player.targetY = gameState.ball.y;
        }
        moveTowardsTarget(player, config.aiSpeed);
    }

    function updatePositioningPlayerAI(player) {
        // Posicionamento baseado no estado do jogo
        if (gameState.ballOwner && gameState.players.find(p => p.name === gameState.ballOwner).team === 'team-b') {
            // Time vermelho tem a bola - posicionamento ofensivo
            if (Math.random() < 0.5) {
                // Posição de ataque
                player.targetX = 300 + Math.random() * 200;
                player.targetY = 100 + Math.random() * 300;
            } else {
                // Posição de apoio
                const ballOwner = gameState.players.find(p => p.name === gameState.ballOwner);
                player.targetX = ballOwner.x + 100 + (Math.random() * 100 - 50);
                player.targetY = ballOwner.y + (Math.random() * 100 - 50);
            }
        } else {
            // Posicionamento defensivo
            player.targetX = 500 + Math.random() * 150;
            player.targetY = 100 + Math.random() * 300;
        }
        
        // Evita aglomeração com outros jogadores
        teamBPlayers.forEach(teammate => {
            if (teammate !== player && !teammate.isGoalkeeper) {
                const dx = teammate.x - player.targetX;
                const dy = teammate.y - player.targetY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 80) {
                    // Ajusta posição para evitar aglomeração
                    player.targetX += (dx / distance) * 100;
                    player.targetY += (dy / distance) * 100;
                }
            }
        });
        
        moveTowardsTarget(player, config.aiSpeed * 0.8);
    }

    // ... (restante do código permanece igual)
});