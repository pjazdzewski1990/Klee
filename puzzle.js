// use for debug
const resourceDir = "test_res"
// use for the real app
//const resourceDir = "res"

// size of the board
const rows = 5;
const columns = 5;

const attributeForXCoordinate = "data-coord-x"
const attributeForYCoordinate = "data-coord-y"

class Riddle {
    constructor(answer) {
        // this is the expected result
        this.answer = answer;
        this.riddle = Riddle.randomizeRiddleString(answer);
    }

    static defaultRiddleString = "01020304050607080910111213141516171819202122232425";

    static randomizeRiddleString(answer) {
//        return "25020304050607080910111213141516171819202122232401";
        const parts = answer.match(/.{1,2}/g);
        const shuffled = parts.sort(() => Math.random() - 0.5);
        return shuffled.join("");
    }

    getRiddlePart(position) {
        return this.riddle.substring(2*position, 2*(position+1));
    }

    answerIsCorrect(proposedAnswerArray) {
        const proposedAnswer = proposedAnswerArray.map(a => a.join("")).join("");
        console.log(`answerIsCorrect ${proposedAnswer} =?= ${this.answer}`);
        return proposedAnswer === this.answer;
    }

    riddleAsUrl() {
        return this.riddle;
    }
}

function getUrlParamByName(name) {
    const params = new URLSearchParams(document.location.search);
    return params.get(name);
}

function riddleFromUrl() {
    const riddleStr = getUrlParamByName("riddle");
    if(riddleStr) {
        return new Riddle(riddleStr);
    } else {
        return new Riddle(Riddle.randomizeRiddleString(Riddle.defaultRiddleString));
    }
}

//const riddleToSolve = new Riddle("01020304050607080910111213141516171819202122232425");
const riddleToSolve = riddleFromUrl();
const currentAnswer = [];

function riddlePartRenderer(xCoord, yCoord, riddlePosition) {
    const tile = document.createElement("img");
    tile.src = `./${resourceDir}/${riddlePosition}.jpg`;

    tile.setAttribute(attributeForXCoordinate, xCoord);
    tile.setAttribute(attributeForYCoordinate, yCoord);

    return tile;
}

function appendInteractionToTile(tile) {
    tile.addEventListener("dragstart", dragStart);
    tile.addEventListener("dragover", dragOver);
    tile.addEventListener("dragenter", dragEnter);
    tile.addEventListener("dragleave", dragLeave);
    tile.addEventListener("drop", dragDrop);
    tile.addEventListener("dragend", dragEnd);
    return tile;
}

// there are 2 players - speaker and doer
const isSpeaker = !getUrlParamByName("riddle");
const isDoer = !isSpeaker;

// by default the deadline is: now + 5m so 5m of work
function defaultDeadline() {
    // for test we reduce that to a low value
    const minutesForRiddleByDefault = 5;
    return new Date().getTime() + (1 + 1000 * 60 * minutesForRiddleByDefault);
}

window.onload = function() {
    //initialize the 5x5 board
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < columns; c++) {
            const position = c + r * columns;
            const riddlePart = riddleToSolve.getRiddlePart(position);
            const tile = riddlePartRenderer(c, r, riddlePart);
            console.log("is doer?", isDoer);
            if(isDoer) {
                // doer can move the tiles
                appendInteractionToTile(tile);
            }
            document.getElementById("board").append(tile);

            row.push(riddlePart);
        }
        currentAnswer.push(row);
    }

    if(isSpeaker) {
        document.getElementById("speaker_ui").classList.remove("hidden");
        setupShareLinkButton();
    } else {
        document.getElementById("doer_ui").classList.remove("hidden");
        setupSubmitButton();
        setupTimer(parseInt(getUrlParamByName("deadline"), 10) || defaultDeadline());
    }
}

////
//// For speaker
////

function generateLink(riddleToSolve, deadline) {
    const host = window.location.href;
    return `${host}?riddle=${riddleToSolve.riddleAsUrl()}&deadline=${deadline}`;
}

function setupShareLinkButton() {
    document.getElementById("create_link").addEventListener("click", () => {
        const deadline = defaultDeadline();
        console.log("click, deadline=", new Date(deadline));
        const url = generateLink(riddleToSolve, deadline);
        document.getElementById("link").innerText = url;
        document.getElementById("create_link").classList.add("hidden");

        setupTimer(deadline);
    });
};

////
//// For doer
////

// prepare the progress bar
// using https://github.com/tigrr/circle-progress
let progress = null;
let submitting = false;
let gameIsDone = false;

function setupSubmitButton() {
    progress = new CircleProgress("#progress", {
        value: 0,
        max: 10,
    });
    document.getElementById("progress").addEventListener("click", () => {
        if(!submitting) {
            submitting = true;
            progress.attr({ value: 0 });
            submitButtonProgress(0);
        }
    });
}

function submitButtonProgress(round) {
    const delayRound = Math.max(1, round - 5);
    const delay = delayRound * round * 75;
//    console.log("Running submitButtonProgress", round, delay);
    progress.attr({ value: progress.attr('value') + 1 });

    if(round < 9) {
        window.setTimeout(submitButtonProgress, delay, round + 1);
    } else {
        window.setTimeout(submitButtonCheck, 500);
    }
}

function submitButtonCheck() {
    submitting = false;
    if(riddleToSolve.answerIsCorrect(currentAnswer)) {
        // show success
        gameIsDone = true;
        celebrateById("progress");
    } else {
        // show failure
        shakeElementById("progress");
    }
}

function shakeElementById(id) {
    const element = document.getElementById(id);
    element.classList.remove("shaking");
    // trigger repaint, so the shake is applied again
    void element.offsetWidth;
    element.classList.add("shaking");
}

function celebrateById(id) {
    const elemToEmitFrom = document.getElementById(id);
    party.confetti(elemToEmitFrom, {
    	count: party.variation.range(40, 60),
    	spread: party.variation.range(10, 60)
    });
}

//DRAG TILES
var currTile;
var otherTile;

function dragStart() {
    currTile = this; //this refers to image that was clicked on for dragging
}

function dragOver(e) {
    e.preventDefault();
}

function dragEnter(e) {
    e.preventDefault();
}

function dragLeave() {
}

function dragDrop() {
    otherTile = this; //this refers to image that is being dropped on
}

// hidden counter for move count
var moves = 0;

function dragEnd() {
    let currImg = currTile.src;
    let otherImg = otherTile.src;
    currTile.src = otherImg;
    otherTile.src = currImg;

    // update answer state for currently dragged element
    const currXCoord = currTile.getAttribute(attributeForXCoordinate);
    const currYCoord = currTile.getAttribute(attributeForYCoordinate);
    console.log(`Updating ${currYCoord}x${currXCoord}`, currentAnswer[currYCoord][currXCoord]);
    const currRiddlePart = currentAnswer[currYCoord][currXCoord];

    //... update state for the element on which we drop a tile...
    const otherXCoord = otherTile.getAttribute(attributeForXCoordinate);
    const otherYCoord = otherTile.getAttribute(attributeForYCoordinate);
    console.log(`... with ${otherYCoord}x${otherXCoord}`, currentAnswer[otherYCoord][otherXCoord]);
    const otherRiddlePart = currentAnswer[otherYCoord][otherXCoord];

    //... swap positions
    currentAnswer[currYCoord][currXCoord] = otherRiddlePart;
    currentAnswer[otherYCoord][otherXCoord] = currRiddlePart;

    console.log("currentAnswer", currentAnswer);
    console.log("Current status", riddleToSolve.answerIsCorrect(currentAnswer));

    // update the move counter
    moves += 1;
}

// in seconds
var timerTimeLeft = 0;

function setupTimer(endTimestamp) {
    const secondsToCount = Math.floor((new Date(endTimestamp) - new Date())/1000);
    timerTimeLeft = secondsToCount;
    reRenderTheTimer();
    window.setTimeout(timerTick, 1000)
}

function timerTick() {
    timerTimeLeft = Math.max(timerTimeLeft-1, 0);
    reRenderTheTimer();
    if(timerTimeLeft < 30) { // TODO
        shakeElementById("timer");
    }
    if(!gameIsDone) {
        if(timerTimeLeft > 0) {
            window.setTimeout(timerTick, 1000);
        } else {
            endTheGame()
        }
    }
}

function endTheGame() {
    // stop all interactions
    gameIsDone = true;
    const preventInteraction = (e) => { e.stopPropagation(); e.preventDefault(); };
    ["click", "dragstart", "dragover", "dragenter", "dragleave", "drop", "dragend"].map((evt) => {
        document.addEventListener(evt, preventInteraction, true);
    });
    document.body.classList.add("gameisover");
}

function reRenderTheTimer() {
    const minutePart = Math.floor(timerTimeLeft / 60);
    const secondPart = Math.floor(timerTimeLeft % 60);
    const formatted = `${minutePart.toString().padStart(2,'0')}:${secondPart.toString().padStart(2,'0')}`;
    document.getElementById("timer").innerText = formatted;
}