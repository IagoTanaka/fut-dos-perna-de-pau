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
        ballRadius: 10,
        goalWidth: 80,
        goalHeight: 80,
        minDistanceBetweenPlayers: 60
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
            { x: 100, y: 100, name: 'A1', team: 'team-a', role: 'forward' },
            { x: 150, y: 175, name: 'A2', team: 'team-a', role: 'midfielder' },
            { x: 150, y: 325, name: 'A3', team: 'team-a', role: 'midfielder' },
            { x: 200, y: 250, name: 'A4', team: 'team-a', role: 'defender' },
            { x: 50, y: 250, name: 'GA', team: 'team-a', isGoalkeeper: true }
        ];
        
        // Time B (vermelho - direita)
        const teamB = [
            { x: 700, y: 100, name: 'B1', team: 'team-b', role: 'forward' },
            { x: 650, y: 175, name: 'B2', team: 'team-b', role: 'midfielder' },
            { x: 650, y: 325, name: 'B3', team: 'team-b', role: 'midfielder' },
            { x: 600, y: 250, name: 'B4', team: 'team-b', role: 'defender' },
            { x: 750, y: 250, name: 'GB', team: 'team-b', isGoalkeeper: true }
        ];
        
        [...teamA, ...teamB].forEach(p => createPlayer(p));
        gameState.controlledPlayer = gameState.players.find(p => p.name === 'A1');
        gameState.controlledPlayer.isControlled = true;
    }
    
    function createPlayer({x, y, name, team, isGoalkeeper = false, role = 'field'}) {
        const element = document.createElement('div');
        element.className = `player ${team} ${isGoalkeeper ? 'goalkeeper' : ''}`;
        element.textContent = name;
        element.style.left = `${x - config.playerRadius}px`;
        element.style.top = `${y - config.playerRadius}px`;
        field.appendChild(element);
        
        const player = {
            element, x, y, name, team, isGoalkeeper, role,
            targetX: x, targetY: y,
            isControlled: false
        };
        
        gameState.players.push(player);
        return player;
    }
    
    function resetBall() {
        gameState.ball = { x: 400, y: 250, speedX: 0, speedY: 0 };
        gameState.ballOwner = null;
        gameState.lastKicker = null;
        updateBallPosition();
        
        // Resetar posições dos jogadores
        gameState.players.forEach(p => {
            if (p.name === 'A1') p.x = 100, p.y = 100;
            if (p.name === 'A2') p.x = 150, p.y = 175;
            if (p.name === 'A3') p.x = 150, p.y = 325;
            if (p.name === 'A4') p.x = 200, p.y = 250;
            if (p.name === 'GA') p.x = 50, p.y = 250;
            
            if (p.name === 'B1') p.x = 700, p.y = 100;
            if (p.name === 'B2') p.x = 650, p.y = 175;
            if (p.name === 'B3') p.x = 650, p.y = 325;
            if (p.name === 'B4') p.x = 600, p.y = 250;
            if (p.name === 'GB') p.x = 750, p.y = 250;
            
            updatePlayerPosition(p);
        });
        
        gameState.controlledPlayer = gameState.players.find(p => p.name === 'A1');
        gameState.players.forEach(p => p.isControlled = false);
        gameState.controlledPlayer.isControlled = true;
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
        
        // Movimento
        if (key === 'a') player.x = Math.max(config.playerRadius, player.x - config.playerSpeed);
        if (key === 'd') player.x = Math.min(800 - config.playerRadius, player.x + config.playerSpeed);
        if (key === 'w') player.y = Math.max(config.playerRadius, player.y - config.playerSpeed);
        if (key === 's') player.y = Math.min(500 - config.playerRadius, player.y + config.playerSpeed);
        
        // Ações com a bola
        if (gameState.ballOwner === player.name) {
            if (key === 'j') kickBall(player, false); // Chute
            if (key === 'k') kickBall(player, true);  // Passe
            if (key === 'q') switchPlayer();          // Troca jogador
        }
        
        updatePlayerPosition(player);
    }
    
    function switchPlayer() {
        const teamAPlayers = gameState.players.filter(p => p.team === 'team-a' && !p.isGoalkeeper);
        const currentIndex = teamAPlayers.findIndex(p => p === gameState.controlledPlayer);
        const nextIndex = (currentIndex + 1) % teamAPlayers.length;
        
        gameState.controlledPlayer.isControlled = false;
        gameState.controlledPlayer = teamAPlayers[nextIndex];
        gameState.controlledPlayer.isControlled = true;
    }
    
    function kickBall(player, isPass) {
        let targetX, targetY;
        const power = isPass ? config.passPower : config.kickPower;
        
        if (isPass) {
            // Encontra melhor companheiro para passe (excluindo o próprio jogador)
            const teammates = gameState.players.filter(p => 
                p.team === player.team && p !== player && !p.isGoalkeeper);
            
            if (teammates.length > 0) {
                // Prioriza passes para frente (na direção do ataque)
                const bestTarget = teammates.reduce((best, current) => {
                    const bestProgress = player.team === 'team-a' ? best.x : 800 - best.x;
                    const currentProgress = player.team === 'team-a' ? current.x : 800 - current.x;
                    return currentProgress > bestProgress ? current : best;
                });
                targetX = bestTarget.x;
                targetY = bestTarget.y;
            } else {
                targetX = player.team === 'team-a' ? 800 : 0;
                targetY = 250 + (Math.random() * config.goalHeight - config.goalHeight/2);
            }
        } else {
            // Chute para o gol
            targetX = player.team === 'team-a' ? 800 : 0;
            targetY = 250 + (Math.random() * config.goalHeight - config.goalHeight/2);
        }
        
        const angle = Math.atan2(targetY - player.y, targetX - player.x);
        gameState.ball.speedX = Math.cos(angle) * power;
        gameState.ball.speedY = Math.sin(angle) * power;
        gameState.ballOwner = null;
        gameState.lastKicker = player.name;
    }
    
    function updatePlayerPosition(player) {
        player.element.style.left = `${player.x - config.playerRadius}px`;
        player.element.style.top = `${player.y - config.playerRadius}px`;
        
        if (gameState.ballOwner === player.name) {
            const angle = Math.atan2(player.y - gameState.ball.y, player.x - gameState.ball.x);
            gameState.ball.x = player.x - Math.cos(angle) * (config.playerRadius + config.ballRadius);
            gameState.ball.y = player.y - Math.sin(angle) * (config.playerRadius + config.ballRadius);
            updateBallPosition();
        }
    }
    
    function checkCollisions() {
        gameState.players.forEach(player => {
            const dx = player.x - gameState.ball.x;
            const dy = player.y - gameState.ball.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < config.playerRadius + config.ballRadius && 
                !gameState.ballOwner && 
                gameState.lastKicker !== player.name) {
                
                gameState.ballOwner = player.name;
                gameState.ball.speedX = 0;
                gameState.ball.speedY = 0;
                
                // Se for jogador do time A, torna-se controlado
                if (player.team === 'team-a') {
                    gameState.controlledPlayer.isControlled = false;
                    gameState.controlledPlayer = player;
                    gameState.controlledPlayer.isControlled = true;
                }
            }
        });
    }
    
    function updateBallPhysics() {
        if (gameState.ballOwner) {
            const owner = gameState.players.find(p => p.name === gameState.ballOwner);
            if (owner) {
                const angle = Math.atan2(owner.y - gameState.ball.y, owner.x - gameState.ball.x);
                gameState.ball.x = owner.x - Math.cos(angle) * (config.playerRadius + config.ballRadius);
                gameState.ball.y = owner.y - Math.sin(angle) * (config.playerRadius + config.ballRadius);
            }
        } else {
            gameState.ball.x += gameState.ball.speedX;
            gameState.ball.y += gameState.ball.speedY;
            
            gameState.ball.speedX *= config.friction;
            gameState.ball.speedY *= config.friction;
            
            // Colisão com bordas
            if (gameState.ball.x - config.ballRadius < 0) {
                gameState.ball.x = config.ballRadius;
                gameState.ball.speedX = Math.abs(gameState.ball.speedX) * 0.8;
            }
            if (gameState.ball.x + config.ballRadius > 800) {
                gameState.ball.x = 800 - config.ballRadius;
                gameState.ball.speedX = -Math.abs(gameState.ball.speedX) * 0.8;
            }
            if (gameState.ball.y - config.ballRadius < 0) {
                gameState.ball.y = config.ballRadius;
                gameState.ball.speedY = Math.abs(gameState.ball.speedY) * 0.8;
            }
            if (gameState.ball.y + config.ballRadius > 500) {
                gameState.ball.y = 500 - config.ballRadius;
                gameState.ball.speedY = -Math.abs(gameState.ball.speedY) * 0.8;
            }
        }
    }
    
    function checkGoals() {
        // Gol do time B (direita)
        if (gameState.ball.x - config.ballRadius <= 0) {
            const goalTop = 250 - config.goalHeight/2;
            const goalBottom = 250 + config.goalHeight/2;
            
            if (gameState.ball.y > goalTop && gameState.ball.y < goalBottom) {
                gameState.scores.right++;
                rightScore.textContent = gameState.scores.right;
                resetBall();
            } else {
                gameState.ball.x = config.ballRadius;
                gameState.ball.speedX = Math.abs(gameState.ball.speedX) * 0.8;
            }
        }
        
        // Gol do time A (esquerda)
        if (gameState.ball.x + config.ballRadius >= 800) {
            const goalTop = 250 - config.goalHeight/2;
            const goalBottom = 250 + config.goalHeight/2;
            
            if (gameState.ball.y > goalTop && gameState.ball.y < goalBottom) {
                gameState.scores.left++;
                leftScore.textContent = gameState.scores.left;
                resetBall();
            } else {
                gameState.ball.x = 800 - config.ballRadius;
                gameState.ball.speedX = -Math.abs(gameState.ball.speedX) * 0.8;
            }
        }
    }

    function updateTeamFormation(team) {
        const teamPlayers = gameState.players.filter(p => p.team === team);
        const hasPossession = gameState.ballOwner && gameState.players.find(p => p.name === gameState.ballOwner).team === team;
        const ballInAttackingHalf = gameState.ball.x < (team === 'team-a' ? 400 : 400);

        // Novas formações mais espaçadas
        const formation = {
            attacking: {
                'A1': { x: gameState.controlledPlayer.x + 120, y: gameState.controlledPlayer.y - 80 },
                'A2': { x: gameState.controlledPlayer.x + 80, y: gameState.controlledPlayer.y + 80 },
                'A3': { x: gameState.controlledPlayer.x - 50, y: gameState.controlledPlayer.y - 50 },
                'A4': { x: gameState.controlledPlayer.x - 50, y: gameState.controlledPlayer.y + 50 },
                'B1': { x: 200, y: 100 },
                'B2': { x: 300, y: 150 },
                'B3': { x: 300, y: 350 },
                'B4': { x: 450, y: 250 }
            },
            defending: {
                'A1': { x: 250, y: 100 },
                'A2': { x: 200, y: 175 },
                'A3': { x: 200, y: 325 },
                'A4': { x: 150, y: 250 },
                'B1': { x: 550, y: 100 },
                'B2': { x: 600, y: 175 },
                'B3': { x: 600, y: 325 },
                'B4': { x: 650, y: 250 }
            }
        };

        const currentFormation = (hasPossession || ballInAttackingHalf) ? formation.attacking : formation.defending;

        teamPlayers.forEach(player => {
            if (!player.isGoalkeeper && currentFormation[player.name]) {
                if (!player.isControlled) {
                    player.targetX = currentFormation[player.name].x;
                    player.targetY = currentFormation[player.name].y;
                    
                    const dx = player.targetX - gameState.controlledPlayer.x;
                    const dy = player.targetY - gameState.controlledPlayer.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < config.minDistanceBetweenPlayers) {
                        const angle = Math.atan2(dy, dx);
                        player.targetX = gameState.controlledPlayer.x + Math.cos(angle) * config.minDistanceBetweenPlayers;
                        player.targetY = gameState.controlledPlayer.y + Math.sin(angle) * config.minDistanceBetweenPlayers;
                    }
                }
            }
        });
    }

    function updateAI() {
        gameState.aiDecisionCounter++;
        
        // Atualiza formação para ambos os times
        updateTeamFormation('team-a');
        updateTeamFormation('team-b');
        
        // IA para o time B (inimigo)
        const teamBPlayers = gameState.players.filter(p => p.team === 'team-b');
        const ballOwner = gameState.ballOwner ? gameState.players.find(p => p.name === gameState.ballOwner) : null;
        
        // Time B - Defesa/Ataque
        teamBPlayers.forEach(player => {
            if (player.isGoalkeeper) {
                // IA do goleiro
                player.targetY = Math.max(200, Math.min(300, gameState.ball.y));
                player.targetX = 750;
            } else if (!gameState.ballOwner || gameState.ballOwner.team === 'team-a') {
                // Se o time A tem a bola ou está solta, vai atrás dela
                if (player.role === 'defender') {
                    // Defensores ficam mais recuados
                    player.targetX = Math.min(600, gameState.ball.x + 100);
                } else {
                    player.targetX = gameState.ball.x;
                }
                player.targetY = gameState.ball.y;
            } else if (gameState.ballOwner.team === 'team-b') {
                // Se o time B tem a bola, se posiciona para ataque
                if (player === ballOwner) {
                    // Jogador com a bola avança agressivamente
                    player.targetX = Math.max(100, player.x - 10); // Move para a esquerda (em direção ao gol)
                    
                    // Verifica se está em posição de chutar
                    const inShootingRange = player.x < 300;
                    const hasShootingAngle = Math.abs(player.y - 250) < 150;
                    
                    if (inShootingRange && hasShootingAngle && Math.random() < 0.3) {
                        kickBall(player, false); // Chuta para o gol
                    } else if (Math.random() < 0.2) {
                        // Chance de passar para um companheiro mais avançado
                        const advancedTeammates = teamBPlayers.filter(p => 
                            !p.isGoalkeeper && p !== player && p.x < player.x);
                        
                        if (advancedTeammates.length > 0) {
                            kickBall(player, true);
                        }
                    }
                } else {
                    // Outros jogadores se posicionam para ataque
                    const attackPositions = {
                        'B1': { x: Math.max(100, ballOwner.x - 150), y: 100 },  // Avançado
                        'B2': { x: Math.max(200, ballOwner.x - 100), y: 150 },  // Meia
                        'B3': { x: Math.max(200, ballOwner.x - 100), y: 350 },  // Meia
                        'B4': { x: Math.max(300, ballOwner.x - 50), y: 250 }    // Defensor avançado
                    };
                    
                    if (attackPositions[player.name]) {
                        player.targetX = attackPositions[player.name].x;
                        player.targetY = attackPositions[player.name].y;
                    }
                }
            }
            
            movePlayerTowardsTarget(player);
            keepPlayerInBounds(player);
            updatePlayerPosition(player);
        });

        // Time A - Apoio quando não está com a bola
        const teamAPlayers = gameState.players.filter(p => p.team === 'team-a' && !p.isControlled && !p.isGoalkeeper);
        
        teamAPlayers.forEach(player => {
            if (!gameState.ballOwner || gameState.ballOwner.team === 'team-b') {
                // Se o time B tem a bola ou está solta, vai atrás dela
                player.targetX = gameState.ball.x;
                player.targetY = gameState.ball.y;
            }
            
            movePlayerTowardsTarget(player);
            keepPlayerInBounds(player);
            updatePlayerPosition(player);
        });

        // Toma decisões para o time B
        if (gameState.aiDecisionCounter >= config.aiDecisionInterval && ballOwner && ballOwner.team === 'team-b') {
            gameState.aiDecisionCounter = 0;
            makeTeamDecision(ballOwner, teamBPlayers);
        }
    }

    function movePlayerTowardsTarget(player) {
        if (player.isControlled) return;
        
        const dx = player.targetX - player.x;
        const dy = player.targetY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) {
            const speed = player.team === 'team-b' ? config.aiSpeed : config.aiSpeed * 0.8;
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

    function makeTeamDecision(playerWithBall, teammates) {
        const distToGoal = playerWithBall.team === 'team-a' ? 800 - playerWithBall.x : playerWithBall.x;
        const inShootingRange = distToGoal < 300;
        const hasGoodAngle = Math.abs(playerWithBall.y - 250) < 150;
        
        // Chance maior de chutar quando está perto do gol
        if (inShootingRange && hasGoodAngle && Math.random() < 0.7) {
            kickBall(playerWithBall, false);
            return;
        }

        // Procura companheiros mais avançados para passar
        const passOptions = teammates.filter(p => 
            !p.isGoalkeeper && 
            p !== playerWithBall &&
            ((playerWithBall.team === 'team-a' && p.x > playerWithBall.x) || 
             (playerWithBall.team === 'team-b' && p.x < playerWithBall.x)) &&
            Math.abs(p.y - playerWithBall.y) < 200
        );

        if (passOptions.length > 0 && Math.random() < 0.8) {
            // Prioriza passes para jogadores mais avançados
            const bestReceiver = passOptions.reduce((best, current) => 
                (playerWithBall.team === 'team-a' ? current.x > best.x : current.x < best.x) ? current : best
            );
            
            // Ajusta o alvo do passe para frente do jogador
            const passTarget = {
                x: bestReceiver.x - (playerWithBall.team === 'team-a' ? -30 : 30),
                y: bestReceiver.y
            };
            
            const angle = Math.atan2(passTarget.y - playerWithBall.y, passTarget.x - playerWithBall.x);
            gameState.ball.speedX = Math.cos(angle) * config.passPower;
            gameState.ball.speedY = Math.sin(angle) * config.passPower;
            gameState.ballOwner = null;
            gameState.lastKicker = playerWithBall.name;
        } else {
            // Se não há opções de passe, avança com a bola
            playerWithBall.targetX = playerWithBall.team === 'team-a' ? 
                Math.min(700, playerWithBall.x + 50) : 
                Math.max(100, playerWithBall.x - 50);
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