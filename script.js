document.addEventListener('DOMContentLoaded', function() {
    const field = document.querySelector('.field');
    const ball = document.getElementById('ball');
    const leftScore = document.querySelector('.left-score');
    const rightScore = document.querySelector('.right-score');
    
    // Configurações do jogo
    const config = {
        playerSpeed: 3,
        kickPower: 10,
        goalkeeperPower: 15,
        passPower: 8,
        friction: 0.98,
        minSpeed: 0.1
    };
    
    // Estado do jogo
    const gameState = {
        ball: { x: 400, y: 250, speedX: 0, speedY: 0 },
        ballOwner: null,
        lastKicker: null,
        scores: { left: 0, right: 0 },
        controlledPlayer: null,
        players: []
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
        
        // Define o jogador controlado inicial (A1)
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
            element,
            x,
            y,
            name,
            team,
            isGoalkeeper,
            targetX: x,
            targetY: y
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
        
        // Movimentação
        if (key === 'a') player.x = Math.max(10, player.x - config.playerSpeed);
        if (key === 'd') player.x = Math.min(790, player.x + config.playerSpeed);
        if (key === 'w') player.y = Math.max(10, player.y - config.playerSpeed);
        if (key === 's') player.y = Math.min(490, player.y + config.playerSpeed);
        
        // Ações com bola
        if (gameState.ballOwner === player.name) {
            if (key === 'm') kickBall(player, true);  // Passe
            if (key === 'j') kickBall(player, false); // Chute
        }
        
        updatePlayerPosition(player);
    }
    
    function kickBall(player, isPass) {
        let targetX, targetY;
        const power = player.isGoalkeeper ? config.goalkeeperPower : 
                      isPass ? config.passPower : config.kickPower;
        
        if (isPass) {
            // Encontra o melhor companheiro para passar
            const teammates = gameState.players.filter(p => 
                p.team === player.team && p.name !== player.name);
            
            if (teammates.length > 0) {
                // Escolhe o companheiro mais bem posicionado
                const bestTarget = teammates.reduce((best, current) => {
                    const bestScore = calculatePassScore(player, best);
                    const currentScore = calculatePassScore(player, current);
                    return currentScore > bestScore ? current : best;
                }, teammates[0]);
                
                targetX = bestTarget.x;
                targetY = bestTarget.y;
            } else {
                // Sem companheiros, chuta para frente
                targetX = player.team === 'team-a' ? 800 : 0;
                targetY = 250;
            }
        } else {
            // Chute para o gol
            targetX = player.team === 'team-a' ? 800 : 0;
            targetY = 250 + (Math.random() * 100 - 50); // Aleatoriedade no chute
        }
        
        // Calcula direção
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
        
        // Prefere passes para frente
        const forwardScore = from.team === 'team-a' ? dx : -dx;
        
        // Distância ideal entre 100-200 pixels
        const distanceScore = -Math.abs(distance - 150) / 50;
        
        // Evita passes para trás
        const backPenalty = forwardScore < 0 ? -50 : 0;
        
        return forwardScore * 0.7 + distanceScore * 0.3 + backPenalty;
    }
    
    function updatePlayerPosition(player) {
        player.element.style.left = `${player.x}px`;
        player.element.style.top = `${player.y}px`;
        
        // Atualiza posição da bola se o jogador é o dono
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
                // Jogador pegou a bola
                gameState.ballOwner = player.name;
                gameState.ball.speedX = 0;
                gameState.ball.speedY = 0;
                
                // Se for do time azul, torna-se o controlado
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
            // Movimento da bola
            gameState.ball.x += gameState.ball.speedX;
            gameState.ball.y += gameState.ball.speedY;
            
            // Atrito
            gameState.ball.speedX *= config.friction;
            gameState.ball.speedY *= config.friction;
            
            // Limites do campo
            if (gameState.ball.x < 10) gameState.ball.speedX = Math.abs(gameState.ball.speedX) * 0.8;
            if (gameState.ball.x > 790) gameState.ball.speedX = -Math.abs(gameState.ball.speedX) * 0.8;
            if (gameState.ball.y < 10) gameState.ball.speedY = Math.abs(gameState.ball.speedY) * 0.8;
            if (gameState.ball.y > 490) gameState.ball.speedY = -Math.abs(gameState.ball.speedY) * 0.8;
            
            // Parar quando muito lento
            if (Math.abs(gameState.ball.speedX) < config.minSpeed) gameState.ball.speedX = 0;
            if (Math.abs(gameState.ball.speedY) < config.minSpeed) gameState.ball.speedY = 0;
        }
    }
    
    function checkGoals() {
        // Gol do time B (esquerdo)
        if (gameState.ball.x < 10 && gameState.ball.y > 210 && gameState.ball.y < 290) {
            gameState.scores.right++;
            rightScore.textContent = gameState.scores.right;
            resetBall();
        }
        
        // Gol do time A (direito)
        if (gameState.ball.x > 790 && gameState.ball.y > 210 && gameState.ball.y < 290) {
            gameState.scores.left++;
            leftScore.textContent = gameState.scores.left;
            resetBall();
        }
    }
    
    function updateAI() {
        // Time B (vermelho - IA)
        const teamBPlayers = gameState.players.filter(p => p.team === 'team-b');
        
        // Ordena jogadores por proximidade da bola
        const playersByDistance = [...teamBPlayers].sort((a, b) => {
            const distA = distanceToBall(a);
            const distB = distanceToBall(b);
            return distA - distB;
        });
        
        // Apenas 2 jogadores mais próximos perseguem a bola
        const chasingPlayers = playersByDistance.slice(0, 2);
        
        teamBPlayers.forEach(player => {
            if (player.isGoalkeeper) {
                updateGoalkeeperAI(player);
            } else if (chasingPlayers.includes(player)) {
                updateChasingPlayerAI(player);
            } else {
                updatePositioningPlayerAI(player);
            }
            
            // Limita área de atuação
            player.x = Math.max(400, Math.min(790, player.x));
            player.y = Math.max(50, Math.min(450, player.y));
            
            updatePlayerPosition(player);
        });
        
        // Decisões de passe/chute
        if (gameState.ballOwner && teamBPlayers.some(p => p.name === gameState.ballOwner)) {
            const playerWithBall = teamBPlayers.find(p => p.name === gameState.ballOwner);
            
            // Chance baseada na distância do gol
            const distToGoal = Math.abs(playerWithBall.x - (playerWithBall.team === 'team-b' ? 0 : 800));
            const actionChance = 0.02 + (0.1 * (1 - distToGoal / 800));
            
            if (Math.random() < actionChance) {
                const shouldPass = Math.random() < 0.4;
                kickBall(playerWithBall, shouldPass);
            }
        }
    }
    
    function distanceToBall(player) {
        const dx = player.x - gameState.ball.x;
        const dy = player.y - gameState.ball.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    function updateGoalkeeperAI(player) {
        if (gameState.ballOwner && gameState.players.find(p => p.name === gameState.ballOwner).team === 'team-a') {
            // Bola com time azul, posiciona-se no gol
            player.targetX = 720;
            player.targetY = Math.max(210, Math.min(290, gameState.ball.y));
        } else {
            // Posição padrão do goleiro
            player.targetX = 750;
            player.targetY = 250;
        }
        
        moveTowardsTarget(player);
    }
    
    function updateChasingPlayerAI(player) {
        if (gameState.ballOwner === player.name) {
            // Tem a bola, posiciona-se para ataque
            player.targetX = 500 + Math.random() * 100;
            player.targetY = 100 + Math.random() * 300;
        } else if (gameState.ballOwner && gameState.players.find(p => p.name === gameState.ballOwner).team === 'team-b') {
            // Companheiro tem a bola, posiciona-se para receber
            player.targetX = gameState.ball.x + (Math.random() * 100 - 50);
            player.targetY = gameState.ball.y + (Math.random() * 100 - 50);
        } else {
            // Bola livre, persegue a bola
            player.targetX = gameState.ball.x;
            player.targetY = gameState.ball.y;
        }
        
        moveTowardsTarget(player);
    }
    
    function updatePositioningPlayerAI(player) {
        // Posicionamento estratégico quando não está perseguindo a bola
        player.targetX = 550 + (Math.random() * 100);
        player.targetY = 100 + (Math.random() * 300);
        moveTowardsTarget(player);
    }
    
    function moveTowardsTarget(player) {
        const dx = player.targetX - player.x;
        const dy = player.targetY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) {
            player.x += (dx / distance) * 2;
            player.y += (dy / distance) * 2;
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