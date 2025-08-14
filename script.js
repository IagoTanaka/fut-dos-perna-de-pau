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
        aiDecisionInterval: 20,
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
        aiDecisionCounter: 0,
        gameMode: 'normal' // 'normal' ou 'kickoff'
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
            isControlled: false,
            state: 'positioning' // 'positioning', 'attacking', 'defending', 'seeking'
        };
        
        gameState.players.push(player);
        return player;
    }
    
    function resetBall() {
        gameState.ball = { x: 400, y: 250, speedX: 0, speedY: 0 };
        gameState.ballOwner = null;
        gameState.lastKicker = null;
        gameState.gameMode = 'kickoff';
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
            
            p.state = 'positioning';
            updatePlayerPosition(p);
        });
        
        gameState.controlledPlayer = gameState.players.find(p => p.name === 'A1');
        gameState.players.forEach(p => p.isControlled = false);
        gameState.controlledPlayer.isControlled = true;
        
        // Depois de 1 segundo, volta ao modo normal
        setTimeout(() => gameState.gameMode = 'normal', 1000);
    }
    
    function updateBallPosition() {
        ball.style.left = `${gameState.ball.x - config.ballRadius}px`;
        ball.style.top = `${gameState.ball.y - config.ballRadius}px`;
    }
    
    function setupControls() {
        document.addEventListener('keydown', handleKeyDown);
    }
    
    function handleKeyDown(e) {
        if (!gameState.controlledPlayer || gameState.gameMode === 'kickoff') return;
        
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
        if (gameState.gameMode === 'kickoff') return;
        
        let targetX, targetY;
        const power = isPass ? config.passPower : config.kickPower;
        
        if (isPass) {
            // Encontra melhor companheiro para passe
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
        if (gameState.gameMode === 'kickoff') return;
        
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
        if (gameState.gameMode === 'kickoff') return;
        
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
        if (gameState.gameMode === 'kickoff') return;
        
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

    function updateAI() {
        if (gameState.gameMode === 'kickoff') return;
        
        gameState.aiDecisionCounter++;
        
        // Atualiza todos os jogadores não controlados
        gameState.players.forEach(player => {
            if (player.isControlled || player.isGoalkeeper) return;
            
            // Determina o estado do jogador
            updatePlayerState(player);
            
            // Executa comportamento baseado no estado
            executePlayerBehavior(player);
            
            // Move o jogador
            movePlayerTowardsTarget(player);
            keepPlayerInBounds(player);
            updatePlayerPosition(player);
        });

        // Toma decisões para jogadores com bola
        const ballOwner = gameState.ballOwner ? gameState.players.find(p => p.name === gameState.ballOwner) : null;
        if (ballOwner && !ballOwner.isControlled && gameState.aiDecisionCounter >= config.aiDecisionInterval) {
            makeTeamDecision(ballOwner);
            gameState.aiDecisionCounter = 0;
        }
    }

    function updatePlayerState(player) {
        const hasBall = gameState.ballOwner === player.name;
        const ballOwner = gameState.ballOwner ? gameState.players.find(p => p.name === gameState.ballOwner) : null;
        
        if (hasBall) {
            player.state = 'attacking';
        } else if (ballOwner && ballOwner.team === player.team) {
            // Se um companheiro tem a bola
            player.state = 'positioning';
        } else {
            // Se o adversário tem a bola ou a bola está solta
            player.state = 'seeking';
        }
    }

    function executePlayerBehavior(player) {
        const ballOwner = gameState.ballOwner ? gameState.players.find(p => p.name === gameState.ballOwner) : null;
        
        switch (player.state) {
            case 'attacking':
                handleAttacking(player);
                break;
                
            case 'positioning':
                handlePositioning(player);
                break;
                
            case 'seeking':
                handleSeeking(player);
                break;
        }
    }

    function handleAttacking(player) {
        // Jogador com a bola decide o que fazer
        const goalX = player.team === 'team-a' ? 800 : 0;
        const goalY = 250;
        const distToGoal = Math.sqrt(Math.pow(goalX - player.x, 2) + Math.pow(goalY - player.y, 2));
        
        // Chance de chutar se estiver perto do gol
        if (distToGoal < 300 && Math.random() < 0.3) {
            kickBall(player, false);
            return;
        }
        
        // Chance de passar para um companheiro mais avançado
        if (Math.random() < 0.4) {
            const teammates = gameState.players.filter(p => 
                p.team === player.team && 
                p !== player && 
                !p.isGoalkeeper &&
                ((player.team === 'team-a' && p.x > player.x) || 
                 (player.team === 'team-b' && p.x < player.x)));
            
            if (teammates.length > 0) {
                kickBall(player, true);
                return;
            }
        }
        
        // Se não chutou nem passou, avança com a bola
        player.targetX = player.team === 'team-a' ? 
            Math.min(700, player.x + 50) : 
            Math.max(100, player.x - 50);
            
        // Move em direção ao gol com algum desvio aleatório
        const targetY = 250 + (Math.random() * 200 - 100);
        player.targetY = Math.max(50, Math.min(450, targetY));
    }

    function handlePositioning(player) {
        // Jogador sem bola se posiciona estrategicamente
        const ballOwner = gameState.players.find(p => p.name === gameState.ballOwner);
        
        if (ballOwner && ballOwner.team === player.team) {
            // Posiciona-se de acordo com o papel
            if (player.role === 'forward') {
                player.targetX = ballOwner.team === 'team-a' ? 
                    Math.min(700, ballOwner.x + 150) : 
                    Math.max(100, ballOwner.x - 150);
                player.targetY = 100 + (player.name === 'A1' || player.name === 'B1' ? 0 : 300);
            } else if (player.role === 'midfielder') {
                player.targetX = ballOwner.team === 'team-a' ? 
                    Math.min(600, ballOwner.x + 80) : 
                    Math.max(200, ballOwner.x - 80);
                player.targetY = player.name === 'A2' || player.name === 'B2' ? 175 : 325;
            } else if (player.role === 'defender') {
                player.targetX = ballOwner.team === 'team-a' ? 
                    Math.min(500, ballOwner.x - 50) : 
                    Math.max(300, ballOwner.x + 50);
                player.targetY = 250;
            }
        }
    }

    function handleSeeking(player) {
        // Jogador sem bola vai atrás da bola ou marca adversário
        if (!gameState.ballOwner) {
            // Se a bola está solta, vai até ela
            player.targetX = gameState.ball.x;
            player.targetY = gameState.ball.y;
        } else {
            // Se o adversário tem a bola, marcação
            const ballOwner = gameState.players.find(p => p.name === gameState.ballOwner);
            if (ballOwner) {
                player.targetX = ballOwner.x;
                player.targetY = ballOwner.y;
            }
        }
    }

    function movePlayerTowardsTarget(player) {
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

    function makeTeamDecision(playerWithBall) {
        // Decisão já é tratada no handleAttacking
        // Esta função é mantida para compatibilidade
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