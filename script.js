document.addEventListener('DOMContentLoaded', function() {
    const field = document.querySelector('.field');
    const ball = document.getElementById('ball');
    const leftScore = document.querySelector('.left-score');
    const rightScore = document.querySelector('.right-score');
    
    let ballX = 400;
    let ballY = 250;
    let ballSpeedX = 0;
    let ballSpeedY = 0;
    let ballOwner = null;
    let lastKicker = null;
    
    let scoreLeft = 0;
    let scoreRight = 0;
    
    // Criar jogadores
    const players = [];
    const teamAPlayers = []; // Time azul (controlado pelo jogador)
    const teamBPlayers = []; // Time vermelho (IA)
    
    // Time A (azul - esquerda)
    teamAPlayers.push(createPlayer(100, 100, 'A1', 'team-a'));
    teamAPlayers.push(createPlayer(150, 200, 'A2', 'team-a'));
    teamAPlayers.push(createPlayer(150, 300, 'A3', 'team-a'));
    teamAPlayers.push(createPlayer(200, 250, 'A4', 'team-a'));
    teamAPlayers.push(createPlayer(50, 250, 'GA', 'team-a', true));
    
    // Time B (vermelho - direita)
    teamBPlayers.push(createPlayer(700, 100, 'B1', 'team-b'));
    teamBPlayers.push(createPlayer(650, 200, 'B2', 'team-b'));
    teamBPlayers.push(createPlayer(650, 300, 'B3', 'team-b'));
    teamBPlayers.push(createPlayer(600, 250, 'B4', 'team-b'));
    teamBPlayers.push(createPlayer(750, 250, 'GB', 'team-b', true));
    
    // Jogador controlado pelo usuário (inicia com A1)
    let controlledPlayer = teamAPlayers[0];
    
    // Posicionar bola no centro
    resetBall();
    
    // Função para criar jogadores
    function createPlayer(x, y, name, team, isGoalkeeper = false) {
        const player = document.createElement('div');
        player.className = `player ${team} ${isGoalkeeper ? 'goalkeeper' : ''}`;
        player.textContent = name;
        player.style.left = `${x}px`;
        player.style.top = `${y}px`;
        player.dataset.name = name;
        player.dataset.team = team;
        player.dataset.isGoalkeeper = isGoalkeeper;
        
        field.appendChild(player);
        
        const playerObj = {
            element: player,
            x,
            y,
            name,
            team,
            isGoalkeeper,
            targetX: x,
            targetY: y,
            isMoving: false
        };
        
        players.push(playerObj);
        return playerObj;
    }
    
    // Função para chutar a bola
    function kickBall(playerName, team, isPass = false) {
        const player = players.find(p => p.name === playerName);
        
        let targetX, targetY;
        
        if (isPass) {
            // Passe para outro jogador do mesmo time
            const teammates = players.filter(p => p.team === team && p.name !== playerName);
            if (teammates.length > 0) {
                // Encontra o jogador mais próximo em uma boa posição
                let bestTeammate = null;
                let bestScore = -Infinity;
                
                teammates.forEach(teammate => {
                    // Calcula uma pontuação baseada na proximidade e posição
                    const dx = teammate.x - player.x;
                    const dy = teammate.y - player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Prefere passes para frente (para o ataque)
                    const forwardScore = team === 'team-a' ? dx : -dx;
                    
                    // Evita passes muito curtos ou muito longos
                    const distanceScore = -Math.abs(distance - 150) / 50;
                    
                    const totalScore = forwardScore * 0.7 + distanceScore * 0.3;
                    
                    if (totalScore > bestScore) {
                        bestScore = totalScore;
                        bestTeammate = teammate;
                    }
                });
                
                if (bestTeammate) {
                    targetX = bestTeammate.x;
                    targetY = bestTeammate.y;
                } else {
                    // Se não há companheiros bons, chuta para frente
                    targetX = team === 'team-a' ? 800 : 0;
                    targetY = 250;
                }
            } else {
                // Se não há companheiros, chuta para frente
                targetX = team === 'team-a' ? 800 : 0;
                targetY = 250;
            }
        } else {
            // Chute para o gol adversário
            targetX = team === 'team-a' ? 800 : 0;
            
            // Adiciona um pouco de aleatoriedade no chute
            const variation = (Math.random() - 0.5) * 100;
            targetY = 250 + variation;
            
            // Ajusta para não chutar muito para fora
            targetY = Math.max(150, Math.min(350, targetY));
        }
        
        // Se for goleiro, chute mais forte
        const power = player.isGoalkeeper ? 15 : isPass ? 8 : 10;
        
        // Calcular vetor de direção
        const dx = targetX - player.x;
        const dy = targetY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        ballSpeedX = (dx / distance) * power;
        ballSpeedY = (dy / distance) * power;
        
        ballOwner = null;
        lastKicker = playerName;
    }
    
    // Função para resetar a bola no centro
    function resetBall() {
        ballX = 400;
        ballY = 250;
        ballSpeedX = 0;
        ballSpeedY = 0;
        ballOwner = null;
        updateBallPosition();
    }
    
    // Função para atualizar posição da bola
    function updateBallPosition() {
        ball.style.left = `${ballX}px`;
        ball.style.top = `${ballY}px`;
    }
    
    // Verificar colisões com jogadores
    function checkPlayerCollisions() {
        players.forEach(player => {
            const distance = Math.sqrt(
                Math.pow(player.x - ballX, 2) + 
                Math.pow(player.y - ballY, 2)
            );
            
            if (distance < 20 && ballOwner === null && lastKicker !== player.name) {
                // Jogador pegou a bola
                ballOwner = player.name;
                ballSpeedX = 0;
                ballSpeedY = 0;
                
                // Posicionar bola perto do jogador
                const angle = Math.atan2(player.y - ballY, player.x - ballX);
                ballX = player.x - Math.cos(angle) * 15;
                ballY = player.y - Math.sin(angle) * 15;
                
                // Se o jogador que pegou a bola é do time azul, torna-o o controlado
                if (player.team === 'team-a') {
                    controlledPlayer = player;
                }
            }
        });
    }
    
    // Verificar gols
    function checkGoals() {
        // Gol do time B (bola entrou no gol esquerdo)
        if (ballX < 10 && ballY > 210 && ballY < 290) {
            scoreRight++;
            rightScore.textContent = scoreRight;
            resetBall();
        }
        
        // Gol do time A (bola entrou no gol direito)
        if (ballX > 790 && ballY > 210 && ballY < 290) {
            scoreLeft++;
            leftScore.textContent = scoreLeft;
            resetBall();
        }
    }
    
    // IA para o time vermelho
    function updateAI() {
        // Encontra os 2 jogadores mais próximos da bola
        const closestPlayers = [...teamBPlayers]
            .filter(p => !p.isGoalkeeper)
            .sort((a, b) => {
                const distA = Math.sqrt(Math.pow(a.x - ballX, 2) + Math.pow(a.y - ballY, 2));
                const distB = Math.sqrt(Math.pow(b.x - ballX, 2) + Math.pow(b.y - ballY, 2));
                return distA - distB;
            })
            .slice(0, 2);
        
        // Movimenta apenas os 2 jogadores mais próximos da bola
        teamBPlayers.forEach(player => {
            if (player.isGoalkeeper) {
                // Comportamento do goleiro
                if (ballOwner && players.find(p => p.name === ballOwner).team === 'team-a') {
                    // Bola com o time azul, goleiro se posiciona no gol
                    player.targetX = 720;
                    player.targetY = Math.max(210, Math.min(290, ballY));
                } else {
                    // Bola livre ou com time vermelho, goleiro fica no gol
                    player.targetX = 750;
                    player.targetY = 250;
                }
            } else if (closestPlayers.includes(player)) {
                // Jogadores mais próximos vão atrás da bola
                if (ballOwner && players.find(p => p.name === ballOwner).team === 'team-b') {
                    // Se o time vermelho tem a bola, se posiciona para receber passe
                    player.targetX = ballX + (Math.random() * 100 - 50);
                    player.targetY = ballY + (Math.random() * 100 - 50);
                } else {
                    // Bola livre ou com time azul, vai atrás da bola
                    player.targetX = ballX;
                    player.targetY = ballY;
                }
            } else {
                // Outros jogadores se posicionam estrategicamente
                player.targetX = 600 + (Math.random() * 100 - 50);
                player.targetY = 100 + (Math.random() * 300);
            }
            
            // Limita a área de atuação
            player.targetX = Math.max(400, Math.min(750, player.targetX));
            player.targetY = Math.max(50, Math.min(450, player.targetY));
            
            // Move o jogador suavemente em direção ao alvo
            const dx = player.targetX - player.x;
            const dy = player.targetY - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
                player.x += (dx / distance) * 2;
                player.y += (dy / distance) * 2;
                player.element.style.left = `${player.x}px`;
                player.element.style.top = `${player.y}px`;
            }
        });
        
        // Lógica de passe/chute do time vermelho
        if (ballOwner && players.find(p => p.name === ballOwner).team === 'team-b') {
            // Time vermelho tem a bola
            const playerWithBall = players.find(p => p.name === ballOwner);
            
            // Chance de ação baseada na distância do gol
            const distanceToGoal = Math.abs(playerWithBall.x - (playerWithBall.team === 'team-b' ? 0 : 800));
            const actionChance = 0.02 + (0.1 * (1 - distanceToGoal / 800));
            
            if (Math.random() < actionChance) {
                // 40% de chance de passar, 60% de chutar
                if (Math.random() < 0.4) {
                    kickBall(playerWithBall.name, 'team-b', true);
                } else {
                    kickBall(playerWithBall.name, 'team-b');
                }
            }
        }
    }
    
    // Atualizar física da bola
    function updateBallPhysics() {
        if (ballOwner) {
            const player = players.find(p => p.name === ballOwner);
            if (player) {
                // Bola segue o jogador
                const angle = Math.atan2(player.y - ballY, player.x - ballX);
                ballX = player.x - Math.cos(angle) * 15;
                ballY = player.y - Math.sin(angle) * 15;
            }
        } else {
            // Movimentação da bola
            ballX += ballSpeedX;
            ballY += ballSpeedY;
            
            // Atrito/desaceleração
            ballSpeedX *= 0.98;
            ballSpeedY *= 0.98;
            
            // Rebater nas bordas
            if (ballX < 10) ballSpeedX = Math.abs(ballSpeedX) * 0.8;
            if (ballX > 790) ballSpeedX = -Math.abs(ballSpeedX) * 0.8;
            if (ballY < 10) ballSpeedY = Math.abs(ballSpeedY) * 0.8;
            if (ballY > 490) ballSpeedY = -Math.abs(ballSpeedY) * 0.8;
            
            // Parar a bola se estiver muito devagar
            if (Math.abs(ballSpeedX) < 0.1) ballSpeedX = 0;
            if (Math.abs(ballSpeedY) < 0.1) ballSpeedY = 0;
        }
    }
    
    // Game loop
    function gameLoop() {
        checkPlayerCollisions();
        updateBallPhysics();
        checkGoals();
        updateBallPosition();
        updateAI();
        
        requestAnimationFrame(gameLoop);
    }
    
    // Iniciar o jogo
    gameLoop();
    
    // Controles para mover o jogador controlado
    document.addEventListener('keydown', function(e) {
        if (!controlledPlayer) return;
        
        const speed = 5;
        const key = e.key.toLowerCase();
        
        switch(key) {
            case 'a':
                if (controlledPlayer.x > 10) controlledPlayer.x -= speed;
                break;
            case 'd':
                if (controlledPlayer.x < 790) controlledPlayer.x += speed;
                break;
            case 'w':
                if (controlledPlayer.y > 10) controlledPlayer.y -= speed;
                break;
            case 's':
                if (controlledPlayer.y < 490) controlledPlayer.y += speed;
                break;
            case 'm': // Passar bola
                if (ballOwner === controlledPlayer.name) {
                    kickBall(controlledPlayer.name, controlledPlayer.team, true);
                }
                break;
            case 'j': // Chutar
                if (ballOwner === controlledPlayer.name) {
                    kickBall(controlledPlayer.name, controlledPlayer.team);
                }
                break;
        }
        
        controlledPlayer.element.style.top = `${controlledPlayer.y}px`;
        controlledPlayer.element.style.left = `${controlledPlayer.x}px`;
        
        // Se o jogador é dono da bola, mover a bola junto
        if (ballOwner === controlledPlayer.name) {
            const angle = Math.atan2(controlledPlayer.y - ballY, controlledPlayer.x - ballX);
            ballX = controlledPlayer.x - Math.cos(angle) * 15;
            ballY = controlledPlayer.y - Math.sin(angle) * 15;
        }
    });
});