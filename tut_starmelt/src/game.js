var Game = {
	WIDTH:        800,
	HEIGHT:       640,
	BOX_WIDTH:    32,
	BOX_HEIGHT:   32,
	BOARD_TOP:    100,
	BOARD_LEFT:   160,
	BOARD_ROWS:   10,
	BOARD_COLS:   16,
	TWEEN_FRAMES: 15,
	FONT:         'SyntaxError',
	score:        0
}

Crafty.c('GameBoard', {
	/* The list of colors used for the game */
	COLORS: ['#F00', '#0F0', '#FF0', '#F0F', '#0FF'],

	/**
	 * Initialisation. Adds components, sets positions, creates the board
	 */
	init: function() {
		this.addComponent('2D, Canvas, Color');
		this.x = Game.BOARD_LEFT;
		this.y = Game.BOARD_TOP;
		this.w = Game.BOX_WIDTH * Game.BOARD_COLS;
		this.h = Game.BOX_HEIGHT * Game.BOARD_ROWS;
		this.color('#888');
		this._setupBoard(Game.BOARD_LEFT, Game.BOARD_TOP, Game.BOARD_ROWS, Game.BOARD_COLS, Game.BOX_WIDTH, Game.BOX_HEIGHT);
		this.score = 0;

    this.scoreLabel = Crafty.e("2D, Canvas, SpriteText")
                        .attr({x: Game.BOARD_LEFT, y: Game.BOARD_TOP - 30, w: 32 * 6, h: 32})
                        .registerFont(Game.FONT, 32, 'assets/OSDM_Fnt32x32_SyntaxTerror-Copy2.png')
                        .text("Score: ");

    this.scoreEnt = Crafty.e("2D, Canvas, Color, SpriteText")
                        .attr({x: Game.BOARD_LEFT + this.scoreLabel.w, y: Game.BOARD_TOP - 30,
                               w: this.w - this.scoreLabel.w, h: 32})
                        .font(Game.FONT)
                        .align("right")
                        .color("#000")
                        .text(Game.score);
	},

	/**
	 * Set up the board.
	 * The board is an Array of columns, which again is an Array of Boxes.
	 */
	_setupBoard: function(x, y, rows, cols, bw, bh) {
		this._board = _.range(cols).map(function(c) {
			return _.range(rows).map(function(r) {
				var pos = this._computeBoxPos(x, y, c, r, Game.BOX_WIDTH, Game.BOX_HEIGHT);
				return Crafty.e('AwesomeBox')
					.makeBox(pos.x, pos.y, {
						color: this.COLORS[Crafty.math.randomInt(0, 4)],
						click: _.bind(this._clickHandler, this)
					});
			}, this);
			return column;
		}, this);
	},

	/**
	 * Computes the coordinates for a box.
	 * @param x the left side of the board
	 * @param y the top of the board
	 * @param col the column of the box
	 * @param row the row of the box
	 * @param bw box width
	 * @param bh box height
	 */
	_computeBoxPos: function(x, y, col, row, bw, bh) {
		return {
			x: x + col * bw,
			y: y + (bh * Game.BOARD_ROWS - (row + 1) * bh)
		}
	},

	/**
	 * The callback click handler that is passed to the boxes
	 */
	_clickHandler: function(obj) {
		var frame = Crafty.frame();
		if (!this._blockUntil || this._blockUntil < frame) {
			var aPos = this._translateToArrayPos(obj.x, obj.y);
			this._flagConnectedBoxes(aPos, obj.color);
			this._purgeColumns();
			this._moveBoxesToNewPositions();
		}
	},

	/**
	 * Convert mouse coordinates into board position.
	 * Box (0,0) is in the left bottom corner, while coordinate (0,0) is in the left top!!
	 */
	_translateToArrayPos: function(x, y) {
		return {
			x: Math.floor((x - Game.BOARD_LEFT) / Game.BOX_WIDTH),
			y: (Game.BOARD_ROWS - 1) - Math.floor((y - Game.BOARD_TOP) / Game.BOX_HEIGHT)
		};
	},

	/**
	 * Iterate through all boxes and set new coordinates
	 */
	_moveBoxesToNewPositions: function() {
		_(this._board).each(function(column, c) {
			_(column).each(function(box, r) {
				var pos = this._computeBoxPos(Game.BOARD_LEFT, Game.BOARD_TOP, c, r, Game.BOX_WIDTH, Game.BOX_HEIGHT);
				this._blockUntil = Crafty.frame() + Game.TWEEN_FRAMES;
				box.tween({x: pos.x, y: pos.y}, Game.TWEEN_FRAMES);
			}, this);
		}, this);
	},

	/**
	 * Remove flagged boxes from the columns and empty columns from the board
	 */
	_purgeColumns: function() {
		var filter = function(el) { return !el._flagged; };

		var count =_(this._board).chain().flatten().reject(filter).value().length;
		Game.score += (count === 1) ? -1000 : (count * count * 10);

		_(this._board).each(function(column, c) {
			_(column).chain().reject(filter, this).each(function (el) {
				el.destroy()
			}, this);
		}, this);

		this._board = _(this._board).chain().map(function(column, c) {
			return _(column).select(filter);
		}, this).reject(function(column) {
			return _(column).isEmpty();
		}, this).value();

		if (_(this._board).isEmpty()) Crafty.scene('PlayAgain');
	},

	/**
	 * Flags the passed Box and all connected Boxes of the same color by adding a new property '_flagged = true'.
	 * @param aPos Array position of clicked Box
	 * @param color color of clicked Box
	 */
	_flagConnectedBoxes: function(aPos, color) {
		function flagInternal(aPosList, board) {
			if (_(aPosList).isEmpty()) return;

			var head = _(aPosList).head(),
					tail = _(aPosList).rest();

			if (board[head.x]) {
				var currentBox = board[head.x][head.y];
				if (currentBox && !currentBox._flagged && currentBox._color === color) {
						currentBox._flagged = true;
						tail.push({ x: head.x, y: head.y - 1 });
						tail.push({ x: head.x, y: head.y + 1 });
						tail.push({ x: head.x - 1, y: head.y});
						tail.push({ x: head.x + 1, y: head.y});
				}
			}
			flagInternal(tail, board);
		}
		flagInternal([aPos], this._board);
	}
});

Crafty.c('AwesomeBox', {
	/*
	 * Setting ready: true is crucial when drawing on the Canvas. Otherwise the "Draw" event will not be triggered.
	 */
	ready: true,

	/**
	 * Initialisation. Adds components, sets positions, binds mouse click handler
	 */
	init: function() {
		this.addComponent('2D, Canvas, Color, Mouse, Tween, crate');

		this.w = Game.BOX_WIDTH;
		this.h = Game.BOX_HEIGHT;

		this.bind('Click', function(obj) {
			if (this._onClickCallback) this._onClickCallback({
				x: obj.realX,
				y: obj.realY,
				color: this._color
			});
		});
	},

	/**
	 * Convenience method for creating new boxes
	 * @param x position on the x axis
	 * @param y position on the y axis
	 * @param color background color
	 * @param onClickCallback a callback function that is called for mouse click events
	 */
	makeBox: function(x, y, opts) {
		if (!opts) opts = {};

		this.attr({x: x, y: y}).color(opts.color);
		this._onClickCallback = opts.click;

		return this;
	}
});


// ====== //
// Scenes //
// ====== //

// The loading screen that will display while our assets load
Crafty.scene('Loading', function() {
	console.log('== Loading ==');

	// Load takes an array of assets and a callback when complete
	Crafty.load(['assets/crafty-sprite.png'], function() {
		Crafty.scene('Game'); //when everything is loaded, run the main scene
	});

	// Black background with some loading text
	// Crafty.background('#FFC187');
	Crafty.background('#A9F4FF');

	Crafty.e('2D, DOM, text').attr({w: 100, h: 20, x: 150, y: 120})
		// .text('Loading')
		.css({'text-align': 'center'});
});

/**
 * We are using two Scenes:
 * - the first one is the Game itself and is displayed when loading the page
 * - the second one is the 'Play Again?' Scene, that shows the score and
 *	 restarts the game on mouse click
 */
Crafty.scene('Game', function() {
	console.log('== Game ==');

	// Create the board
	Crafty.e('GameBoard');
});

/**
 * The PlayAgain scene looks pretty ugly, sorry. :)
 */
Crafty.scene('PlayAgain', function() {
	console.log('== Play Again ==');

	var width	 = Game.BOARD_COLS * Game.BOX_WIDTH,
			height	= Game.BOARD_ROWS * Game.BOX_HEIGHT,
			vcenter = Game.BOARD_TOP + height / 2,
			bg			= Crafty.e('2D, Canvas, Color, Mouse')
								 .attr({x: Game.BOARD_LEFT, y: Game.BOARD_TOP, w: width, h: height})
								 .color('#F7941E');

	Crafty.e('CanvasText')
		.attr({x: Game.BOARD_LEFT, y: vcenter - 70, w: width, h: 30})
		.font(Game.FONT)
		.align('center')
		.text('Your Score is');

	Crafty.e('CanvasText')
		.attr({x: Game.BOARD_LEFT, y: vcenter, w: width, h: 30})
		.font(Game.FONT)
		.align('center')
		.text(Game.score);

	Crafty.e('CanvasText')
		.attr({x: Game.BOARD_LEFT, y: vcenter + 80, w: width, h: 30})
		.font(Game.FONT)
		.align('center')
		.text('Click to Play Again!');

	bg.bind('Click', function() {
		Crafty.scene('Game');
	});
});

window.onload = function() {

	// Start crafty
	Crafty.init(Game.WIDTH, Game.HEIGHT);

	/*
	 * Loads the Sprite PNG and create the only sprite 'crate' from it
	 */
	Crafty.sprite(32, 'assets/crate.png', { crate: [0, 0]});
	
	// Automatically play the loading scene
	Crafty.scene('Loading');
};
