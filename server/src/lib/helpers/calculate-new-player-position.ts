import { LobbyPlayerLive, Ball, PositionType } from "../../types/lobby";
import { State } from "../../types/state";
import PLAYER from "../const/player";
import BALL from "../const/ball";
import constrainPositionToField from "./constrain-position-to-field";

type Props = {
  player: LobbyPlayerLive;
  movement: Record<string, boolean>;
  speed: number;
  allPlayers: LobbyPlayerLive[];
  ball: Ball;
  state: State;
  lobbyId: string;
};

const isColliding = (
  position1: PositionType,
  position2: PositionType,
  size1: number,
  size2: number
) => {
  const distance = Math.sqrt(
    Math.pow(position1.x - position2.x, 2) +
      Math.pow(position1.y - position2.y, 2)
  );

  return distance < size1 / 2 + size2 / 2;
};

const handleCollision = (
  position1: PositionType,
  position2: PositionType,
  size1: number,
  size2: number
) => {
  const collisionDirectionX = position1.x - position2.x;
  const collisionDirectionY = position1.y - position2.y;
  const collisionDistance = Math.sqrt(
    collisionDirectionX * collisionDirectionX +
      collisionDirectionY * collisionDirectionY
  );

  if (collisionDistance === 0) {
    return { adjustedPos1: position1, adjustedPos2: position2 };
  }

  const overlap = (size1 / 2 + size2 / 2 - collisionDistance) / 2;

  const adjustmentX = (collisionDirectionX / collisionDistance) * overlap;
  const adjustmentY = (collisionDirectionY / collisionDistance) * overlap;

  position1.x += adjustmentX;
  position1.y += adjustmentY;

  position2.x -= adjustmentX;
  position2.y -= adjustmentY;

  return { adjustedPos1: position1, adjustedPos2: position2 };
};

const handlePlayerCollisions = (
  newPosition: PositionType,
  player: LobbyPlayerLive,
  allPlayers: LobbyPlayerLive[]
) => {
  allPlayers.forEach((otherPlayer) => {
    if (
      otherPlayer.id !== player.id &&
      isColliding(newPosition, otherPlayer.position, PLAYER.SIZE, PLAYER.SIZE)
    ) {
      const result = handleCollision(
        newPosition,
        otherPlayer.position,
        PLAYER.SIZE,
        PLAYER.SIZE
      );
      newPosition = result.adjustedPos1;
      otherPlayer.position = result.adjustedPos2;
    }
  });

  return newPosition;
};

const calculateNewPlayerPosition = ({
  player,
  movement,
  speed,
  allPlayers,
  ball,
  state,
  lobbyId,
}: Props) => {
  const prevPosition = { ...player.position };

  let newPosition = { ...player.position };
  let didBallMove = false;
  let newSpeed = PLAYER.SPEED + Math.max(5, PLAYER.SPEED * (1+speed*0.05));
  if (movement.up) {
    newPosition.y -= newSpeed
  }

  if (movement.down) {
    newPosition.y += newSpeed
  }

  if (movement.left) {
    newPosition.x -= newSpeed
  }

  if (movement.right) {
    newPosition.x += newSpeed
  }

  newPosition = handlePlayerCollisions(newPosition, player, allPlayers);

  // Calculate player velocity
  const playerVelocity = {
    x: newPosition.x - prevPosition.x,
    y: newPosition.y - prevPosition.y,
  };

  // Ball displacement logic with added force based on player velocity
  if (isColliding(newPosition, ball.position, PLAYER.SIZE, BALL.SIZE)) {
    const kickDirectionX = ball.position.x - player.position.x;
    const kickDirectionY = ball.position.y - player.position.y;

    const kickDistance = Math.sqrt(
      kickDirectionX * kickDirectionX + kickDirectionY * kickDirectionY
    );

    ball.velocity.x = newSpeed * kickDirectionX / 140
    ball.velocity.y = newSpeed * kickDirectionY / 140

    didBallMove = true;
  }

  const constrainedPosition = constrainPositionToField(newPosition, {
    state,
    player,
    lobbyId,
  });

  const constrainedBallPosition = constrainPositionToField(ball.position, {
    state,
    ball,
    lobbyId,
  });

  newPosition.x = constrainedPosition.x;
  newPosition.y = constrainedPosition.y;

  ball.position.x = constrainedBallPosition.x;
  ball.position.y = constrainedBallPosition.y;

  return { newPosition, newBallPosition: ball.position, didBallMove };
};

export default calculateNewPlayerPosition;