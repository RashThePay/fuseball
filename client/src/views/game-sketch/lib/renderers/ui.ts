import p5 from "q5";
import type { StateType } from "../state-machine";
import { draw as drawNametag } from "../helpers/nametag";
import PLAYER from "../const/player";
import Player from "../../classes/player";
import LOBBY_STATUS from "@/lib/const/lobby-status";

const userInterfaceRenderer = (p: p5, state: StateType) => {
  const debugLines = [
    `Player position: ${state.controllablePlayer?.properties.position.x.toFixed(
      0
    )}, ${state.controllablePlayer?.properties.position.y.toFixed(0)}`,
    `FPS: ${Number(p.frameRate()).toFixed(0)}`,
  ];

  const fixedElements = (drawCall: () => void) => {
    p.push();
    if (state.controllablePlayer) {
      p.translate(
        state.controllablePlayer.properties.position.x - p.width / 2,
        state.controllablePlayer.properties.position.y - p.height / 2
      );
    }
    drawCall();
    p.pop();
  };

  const drawNametags = () => {
    state.players.forEach((player, key) => {
      drawNametag(p, {
        text: `Player #${key}`,
        position: player.properties.position,
      });
    });

    if (state.controllablePlayer) {
      drawNametag(p, {
        text: `Player`,
        position: state.controllablePlayer.properties.position,
      });
    }
  };

  const drawDebugInfo = () => {
    debugLines.forEach((line, index) => {
      p.text(line, 10, 20 + index * 20);
    });
  };

  const drawSpeechBubble = (player: Player, text: string) => {
    p.push();
    p.textSize(16);

    const bubbleWidth = p.textWidth(text) + 40;
    const bubbleHeight = 60;

    p.translate(
      player.properties.position.x -
        PLAYER.SIZE / 2 -
        PLAYER.BUBBLE_POINTER_OFFSET / 2 +
        PLAYER.BUBBLE_POINTER_SIZE / 2,
      player.properties.position.y -
        PLAYER.SIZE / 2 -
        bubbleHeight -
        PLAYER.BUBBLE_POINTER_SIZE -
        PLAYER.NAMETAG_GAP -
        12
    );

    p.beginShape();
    p.stroke(51);
    p.strokeWeight(4);
    p.fill(255);

    // Top left corner
    p.vertex(PLAYER.BUBBLE_CORNER_RADIUS, 0);
    p.quadraticVertex(0, 0, 0, PLAYER.BUBBLE_CORNER_RADIUS);

    // Bottom left corner
    p.vertex(0, bubbleHeight - PLAYER.BUBBLE_CORNER_RADIUS);
    p.quadraticVertex(
      0,
      bubbleHeight,
      PLAYER.BUBBLE_CORNER_RADIUS,
      bubbleHeight
    );

    // Pointer bottom left
    p.vertex(
      PLAYER.BUBBLE_POINTER_OFFSET - PLAYER.BUBBLE_POINTER_SIZE,
      bubbleHeight
    );

    // Pointer tip
    p.vertex(
      PLAYER.BUBBLE_POINTER_OFFSET,
      bubbleHeight + PLAYER.BUBBLE_POINTER_SIZE
    );

    // Pointer bottom right
    p.vertex(
      PLAYER.BUBBLE_POINTER_OFFSET + PLAYER.BUBBLE_POINTER_SIZE,
      bubbleHeight
    );

    // Bottom right corner
    p.vertex(bubbleWidth - PLAYER.BUBBLE_CORNER_RADIUS, bubbleHeight);
    p.quadraticVertex(
      bubbleWidth,
      bubbleHeight,
      bubbleWidth,
      bubbleHeight - PLAYER.BUBBLE_CORNER_RADIUS
    );

    // Top right corner
    p.vertex(bubbleWidth, PLAYER.BUBBLE_CORNER_RADIUS);
    p.quadraticVertex(
      bubbleWidth,
      0,
      bubbleWidth - PLAYER.BUBBLE_CORNER_RADIUS,
      0
    );

    p.vertex(PLAYER.BUBBLE_CORNER_RADIUS, 0);
    p.endShape(p.CLOSE);

    p.translate(bubbleWidth / 2, bubbleHeight / 2);
    p.textAlign(p.CENTER, p.CENTER);

    p.text(text, 0, 0);

    p.pop();
  };

  const drawLobbyInfo = () => {
    if (!state.currentLobby) return;

    const lobbyStatus = LOBBY_STATUS[state.currentLobby.status];

    p.push();

    p.textSize(18);
    p.textAlign(p.CENTER, p.CENTER);
    p.fill(255);
    p.stroke(51);
    p.strokeWeight(4);
    p.text(state.currentLobby.name, p.width / 2, 40);

    const lobbyNameTextWidth = p.textWidth(state.currentLobby.name);

    p.textSize(24);
    p.fill(lobbyStatus.color);
    p.text(lobbyStatus.text, p.width / 2, 66);

    // scores
    p.fill(255);
    p.textSize(40);
    p.textAlign(p.CENTER, p.CENTER);
    p.text("0", p.width / 2 - lobbyNameTextWidth / 2 - 50, 56);
    p.text("0", p.width / 2 + lobbyNameTextWidth / 2 + 50, 56);

    p.pop();
  };

  const draw = () => {
    p.textFont("Itim");

    drawNametags();

    fixedElements(() => {
      drawDebugInfo();
      drawLobbyInfo();
    });
  };

  return { draw, drawSpeechBubble };
};

export default userInterfaceRenderer;
