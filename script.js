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
    
    // Time A (azul - esquerda)
    createPlayer(100, 100, 'A1', 'team-a');
    createPlayer(150, 200, 'A2', 'team-a');
    createPlayer(150, 300, 'A3', 'team-a');
    createPlayer(200, 250, 'A4', 'team-a');
    createPlayer(50, 250, 'GA', 'team-a', true);
    
    // Time B (vermelho - direita)
    createPlayer(700, 100, 'B1', 'team-b');
    createPlayer(650, 200, 'B2', 'team-b');
    createPlayer(650, 300, 'B3', 'team-b');
    createPlayer(600, 250, 'B4', 'team-b');
    createPlayer(750, 250, 'GB', 'team-b', true);
    
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
        
        players.push({
            element: player,
            x,
            y,
            name,
            team,
            isGoalkeeper
        });
        
        // Adicionar evento de clique para chutar/passar
        player.addEventListener('click', function() {
            if (ballOwner === null || ballOwner === this.dataset.name) {
                kickBall(this.dataset.name, this.dataset.team);
            } else if (Math.sqrt(
                Math.pow(parseInt(this.style.left) - ballX, 2) + 
                Math.pow(parseInt(this.style.top) - ballY, 2)
            ) < 30) {
                // Passe para jogador próximo
                ballOwner = this.dataset.name;
                lastKicker = this.dataset.name;
            }
        });
    }
    
    // Função para chutar a bola
    function kickBall(playerName, team) {
        const player = players.find(p => p.name === playerName);
        
        // Direção do chute depende da posição do jogador e do time
        let targetX, targetY;
        
        if (team === 'team-a') {
            // Time A chuta para direita (gol adversário)
            targetX = 800;
            targetY = 250;
        } else {
            // Time B chuta para esquerda (gol adversário)
            targetX = 0;
            targetY = 250;
        }
        
        // Se for goleiro, chute mais forte
        const power = player.isGoalkeeper ? 15 : 10;
        
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
        
        requestAnimationFrame(gameLoop);
    }
    
    // Iniciar o jogo
    gameLoop();
    
    // Controles para mover jogadores (exemplo para o jogador A1)
    document.addEventListener('keydown', function(e) {
        const playerA1 = players.find(p => p.name === 'A1');
        
        if (e.key === 'ArrowUp' && playerA1.y > 10) playerA1.y -= 10;
        if (e.key === 'ArrowDown' && playerA1.y < 490) playerA1.y += 10;
        if (e.key === 'ArrowLeft' && playerA1.x > 10) playerA1.x -= 10;
        if (e.key === 'ArrowRight' && playerA1.x < 790) playerA1.x += 10;
        
        playerA1.element.style.top = `${playerA1.y}px`;
        playerA1.element.style.left = `${playerA1.x}px`;
        
        // Se o jogador é dono da bola, mover a bola junto
        if (ballOwner === 'A1') {
            const angle = Math.atan2(playerA1.y - ballY, playerA1.x - ballX);
            ballX = playerA1.x - Math.cos(angle) * 15;
            ballY = playerA1.y - Math.sin(angle) * 15;
        }
    });
});
