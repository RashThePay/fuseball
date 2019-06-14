import Player from './classes/Player';
import Ball from './classes/Ball';
import Scene from './classes/Scene';
import Hud from './classes/Hud';
import Bot from './classes/Bot';

import goal from './helpers/goal';
import getPositions from './helpers/getPositions';

import keys from './const/keys';

let state = {
  players: [],

  teamTurn: 1, // 0 is red, 1 is blue
  isStarted: false,
  score: [0, 0],
  timer: 600,
  isLive: true,

  ball: undefined,
  scene: undefined,
  hud: undefined,

  goals: [false, false],
  prevGoals: [false, false],

  isReset: false
}

const sketch = (p) => {
  window.p5 = p;

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);

    // setup timer
    state.timerInterval = setInterval(() => {
      if(state.timer <= 1) {
        state.isLive = false;
        clearInterval(state.timerInterval);
      }
      state.timer--;
    }, 1000);

    // init game objects
    state.scene = new Scene({
      background: p.color(92, 134, 70), /* 81, 140, 50 */
      size: 1400
    });

    let pos = getPositions(state.scene.size);

    state.players[0] = new Player({
      name: 'test1',
      controllable: true,
      color: p.color(86, 139, 231),
      size: 40,
      speed: 5,
      friction: .7,
      pos: {
        x: pos[1][0].x,
        y: pos[1][0].y
      },
      team: 1
    });

    state.players.push(new Bot({
      color: p.color(86, 139, 231),
      size: 40,
      speed: 2.5,
      friction: .7,
      pos: {
        x: pos[0][0].x,
        y: pos[0][0].y
      },
      team: 0
    }, state.players));

    state.ball = new Ball({
      size: 30,
      hitbox: 30,
      friction: .99,
      pos: {
        x: 0,
        y: 0
      }
    });

    state.hud = new Hud();
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  }

  p.draw = () => {
    p.background(state.scene.props.background);

    state.scene.update();
    state.ball.update();
    for(let i in state.players) state.players[i].update();
    for(let i in state.players) state.players[i].drawNameTag(); // should probably figure out a better way to do this
    state.hud.update(state);

    p5.camera.on();

    p.camera.position = state.players[0].sprite.position; // follow player

    for(let i=0; i<state.players.length; i++) {
      let player = state.players[i];

      // collisions
      player.sprite.collide(state.scene.col);
      player.sprite.bounce(state.ball.sprite, () => {
        if(!state.isStarted) state.isStarted = true;
      });


      // simple ai
      if(player.isBot) {
        if(state.isStarted || !state.isStarted && state.teamTurn === player.props.team) {
          player.follow(state.ball.sprite.position);
        }
      }


      // kick action
      player.sprite.overlap(state.ball.hitCollider, () => {
        let angle = Math.atan2(state.ball.sprite.position.y - player.sprite.position.y, state.ball.sprite.position.x - player.sprite.position.x) * 180 / Math.PI;

        if(!player.isBot) {
          for(let j in keys.KICK) {
            if(player.keys[keys.KICK[j]]) {
              if(!state.isStarted) state.isStarted = true; // mark game as started aswell
              return state.ball.sprite.addSpeed(10, angle);
            }
          }
        } else {
          // bot never actually touches the ball so the .collide() and .bounce() events dont work
          if(!state.isStarted) state.isStarted = true;

          let raycastSize = 1800;
          let enemyTeam = player.props.team === 0 ? 1 : 0;
          let enemyGoal = state.scene.goals[enemyTeam];

          let x = Math.cos(angle * Math.PI / 180) * raycastSize + state.ball.sprite.position.x;
          let y = Math.sin(angle * Math.PI / 180) * raycastSize + state.ball.sprite.position.y;

          let shouldKick = false;

          if(enemyGoal.position.x >= state.ball.sprite.position.x) {
            shouldKick = enemyGoal.position.x >= state.ball.sprite.position.x && enemyGoal.position.x <= x;
          } else {
            shouldKick = state.ball.sprite.position.x >= enemyGoal.position.x && x <= enemyGoal.position.x;
          }

          if(shouldKick) return state.ball.sprite.addSpeed(10, angle);

          // p5.line(state.ball.sprite.position.x, state.ball.sprite.position.y, x, y);
        }
      });


      // middle border collision
      if(player.props.team !== state.teamTurn && !state.isStarted) {
        player.sprite.collide(state.scene.middle);
      }


      // sides collision
      if (!state.isStarted) {
        player.sprite.collide(state.scene.sides[player.props.team === 0 ? 1 : 0]);
      }


      // player collision
      for(let j=0; j<state.players.length; j++) {
        if(state.players[j].id !== player.id) player.sprite.bounce(state.players[j].sprite);
      }
    }

    state.ball.sprite.bounce(state.scene.col);

    // detect goals
    state.goals[0] = false;
    state.goals[1] = false;

    state.ball.sprite.overlap(state.scene.goals[0], () => state.goals[0] = true);
    goal(0, state);

    state.ball.sprite.overlap(state.scene.goals[1], () => state.goals[1] = true);
    goal(1, state);

    state.prevGoals[0] = state.goals[0];
    state.prevGoals[1] = state.goals[1];

    // ball fail-safe
    if(state.ball.sprite.position.x <= -(state.scene.size.x / 2) - state.scene.goalSize.x) state.ball.reset();
    if(state.ball.sprite.position.x >= (state.scene.size.x / 2) + state.scene.goalSize.x) state.ball.reset();
    if(state.ball.sprite.position.y <= -(state.scene.size.y / 2)) state.ball.reset();
    if(state.ball.sprite.position.y >= state.scene.size.y / 2) state.ball.reset();
  };
};


export default sketch;