"use strict";

let PrinceJS = {};

PrinceJS.SCALE_FACTOR = 2;

PrinceJS.SCREEN_WIDTH = 320;
PrinceJS.SCREEN_HEIGHT = 200;

PrinceJS.WORLD_WIDTH = PrinceJS.SCREEN_WIDTH * PrinceJS.SCALE_FACTOR;
PrinceJS.WORLD_HEIGHT = PrinceJS.SCREEN_HEIGHT * PrinceJS.SCALE_FACTOR;
PrinceJS.WORLD_RATIO = PrinceJS.WORLD_WIDTH / PrinceJS.WORLD_HEIGHT;

PrinceJS.BLOCK_WIDTH = 32;
PrinceJS.BLOCK_HEIGHT = 63;

PrinceJS.ROOM_HEIGHT = PrinceJS.BLOCK_HEIGHT * 3;
PrinceJS.ROOM_WIDTH = PrinceJS.SCREEN_WIDTH;

PrinceJS.UI_HEIGHT = 8;

PrinceJS.SKIP_TITLE = false;
PrinceJS.SKIP_CUTSCENES = false;

PrinceJS.Init = function () {
  PrinceJS.currentLevel = 1;
  PrinceJS.maxHealth = 3;
  PrinceJS.startTime = undefined;
  PrinceJS.endTime = undefined;
  PrinceJS.strength = 100;
  PrinceJS.danger = true;
  PrinceJS.screenWidth = 0;
};

PrinceJS.Restart = function (game) {
  PrinceJS.Utils.clearQuery(game);
  PrinceJS.Init();
};

PrinceJS.Boot = function (game) {
  PrinceJS.Init();
};

PrinceJS.Boot.prototype = {
  preload: function () {
    this.load.bitmapFont("font", "assets/font/prince_0.png", "assets/font/prince.fnt");
  },

  create: function () {
    this.world.scale.set(PrinceJS.SCALE_FACTOR);
    this.state.start("Preloader");

    PrinceJS.Utils.applyQuery(this.game);
    PrinceJS.Utils.applyScreenWidth(this.game);

    PrinceJS.danger = PrinceJS.currentLevel === 1;
  }
};
