const JUMP_ASSET_VERSION = "20260830-v5";
PLAYER_IMAGES.jump.front = `IMG_1790.png?v=${JUMP_ASSET_VERSION}`;
PLAYER_IMAGES.jump.left = `IMG_1791.png?v=${JUMP_ASSET_VERSION}`;
PLAYER_IMAGES.jump.right = `IMG_1794.png?v=${JUMP_ASSET_VERSION}`;
Object.values(PLAYER_IMAGES.jump).forEach(src => { const img = new Image(); img.src = src; });
currentSpriteKey = "";
setPlayerImage(requestedDirection());
