
///// STATIC SETUP /////
// check if we are running the app locally or not
const isDebug = (window.location.href.indexOf("localhost") != -1);

// size of the board
const rows = 5;
const columns = 5;

const attributeForXCoordinate = "data-coord-x"
const attributeForYCoordinate = "data-coord-y"

// there are 2 players - speaker and doer
const isSpeaker = !getUrlParamByName("riddle");
const isDoer = !isSpeaker;

///// RIDDLE HELPER CLASS /////

class Riddle {
    constructor(answer, riddleSource) {
        // this is the expected result
        this.answer = answer;
        this.riddleSource = riddleSource;
        this.riddle = Riddle.randomizeRiddleString(answer);
    }

    static defaultRiddleString = "01020304050607080910111213141516171819202122232425";

    static randomizeRiddleString(answer) {
        const parts = answer.match(/.{1,2}/g);
        const shuffled = parts.sort(() => Math.random() - 0.5);
        return shuffled.join("");
    }

    static randomizeRiddleSource() {
        // if(isDebug) return "01";

        const knownSources = ["03", "04", "05", "06", "07", "08", "09"];
        return knownSources[Math.floor(Math.random() * knownSources.length)];
    }

    getRiddleSource() {
        return this.riddleSource;
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
        return `riddle=${this.riddle}&source=${this.riddleSource}`;
    }
}

///// HANDLE RIDDLE /////

function getUrlParamByName(name) {
    const params = new URLSearchParams(document.location.search);
    return params.get(name);
}

function riddleFromUrl() {
    const riddleStr = getUrlParamByName("riddle");
    const riddleSource = getUrlParamByName("source");
    if(riddleStr) {
        return new Riddle(riddleStr, riddleSource);
    } else {
        return new Riddle(Riddle.randomizeRiddleString(Riddle.defaultRiddleString), Riddle.randomizeRiddleSource());
    }
}

const riddleToSolve = riddleFromUrl();
const currentAnswer = [];

function riddlePartRenderer(xCoord, yCoord, riddleSource, riddlePosition) {
    const tile = document.createElement("img");
    tile.src = `./res/${riddleSource}/${riddlePosition}.png`;

    tile.setAttribute(attributeForXCoordinate, xCoord);
    tile.setAttribute(attributeForYCoordinate, yCoord);

    return tile;
}

///// HANDLE TIME /////

// by default the deadline is: now + 5m so 5m of work
function defaultDeadline() {
    // for test we reduce that to a low value
    const minutesForRiddleByDefault = 10;
    return new Date().getTime() + (1 + 1000 * 60 * minutesForRiddleByDefault);
}

///// RENDER RIDDLE /////

function appendInteractionToTile(tile) {
    tile.addEventListener("dragstart", dragStart);
    tile.addEventListener("dragover", dragOver);
    tile.addEventListener("dragenter", dragEnter);
    tile.addEventListener("dragleave", dragLeave);
    tile.addEventListener("drop", dragDrop);
    tile.addEventListener("dragend", dragEnd);
    return tile;
}

window.onload = function() {
    const riddleSource = riddleToSolve.getRiddleSource();
    //initialize the 5x5 board
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < columns; c++) {
            const position = c + r * columns;
            const riddlePart = riddleToSolve.getRiddlePart(position);
            const tile = riddlePartRenderer(c, r, riddleSource, riddlePart);
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

///// FOR SPEAKER /////

function generateLink(riddleToSolve, deadline) {
    const host = window.location.href;
    return `${host}?${riddleToSolve.riddleAsUrl()}&deadline=${deadline}`;
}

function setupShareLinkButton() {
    document.getElementById("create_link").addEventListener("click", () => {
        const deadline = defaultDeadline();
        console.log("click, deadline=", new Date(deadline));
        const url = generateLink(riddleToSolve, deadline);

        // put the link into the clipboard
        navigator.clipboard
            .writeText(url)
            .then(res => {
                document.getElementById("create_link").innerHTML = "Copied!"
            })
            .catch(error => console.error(error.message));

        setupTimer(deadline);
    });
};

///// HANDLE SUBMIT /////

// prepare the progress bar
// using https://github.com/tigrr/circle-progress
let progress = null;
let submitting = false;
let gameIsDone = false;

let howManyUpdatesToProgress = 25;
let howManyUpdatesToProgressShouldBeFast = 20;

function setupSubmitButton() {
    progress = new CircleProgress("#progress", {
        value: 0,
        max: howManyUpdatesToProgress,
        textFormat: 'none',
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
    const delay = round<=howManyUpdatesToProgressShouldBeFast ? 250 : round*100;
//    console.log("Running submitButtonProgress", round, delay);
    progress.attr({ value: progress.attr('value') + 1 });

    if(round < (howManyUpdatesToProgress-1)) {
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

///// DRAGGING TILES /////

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

///// HANDLE TIME /////

// in seconds
var timerEndTimestamp = 0;

function setupTimer(endTimestamp) {
    timerEndTimestamp = endTimestamp;
    timerTick();
    window.setTimeout(timerTick, 1000)
}

function timerTick() {
    //TODO: should recalculate the time against the goal, not just assume 1 tick = 1 second
    const secondsToCount = Math.floor((new Date(timerEndTimestamp) - new Date())/1000);
    const timerTimeLeft = Math.max(secondsToCount-1, 0);
    reRenderTheTimer(timerTimeLeft);
    if(timerTimeLeft < 30) {
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

function reRenderTheTimer(timerTimeLeft) {
    const minutePart = Math.floor(timerTimeLeft / 60);
    const secondPart = Math.floor(timerTimeLeft % 60);
    const formatted = `${minutePart.toString().padStart(2,'0')}:${secondPart.toString().padStart(2,'0')}`;
    document.getElementById("timer").innerText = formatted;
}


///// TOUR /////

window.addEventListener('load', function () {
    const stepsForSpeaker = [{
        content: "<p>This is your riddle! Communicate with your partner to crack it</p>",
        title: "",
        target: "#board",
        order: "0",
        group: "tour-speaker",
    },{
        content: "<p>Your partner needs to reproduce the riddle on their end before time is up</p>",
        title: "",
        target: "#timer_section",
        order: "1",
        group: "tour-speaker",
    },{
        content: "<p>Clicking here will provide you with the game link and start it</p>",
        title: "",
        target: "#create_link",
        order: "2",
        group: "tour-speaker",
    },{
        content: "<p>Good luck! Have fun</p>",
        title: "",
        target: "#submit_section",
        order: "3",
        group: "tour-doer",
    }];
    const stepsForDoer = [
    {
        content: "<p>This is your riddle! Move the pieces around so that your riddle is the same as your partners</p>",
        title: "",
        target: "#board",
        order: "0",
        group: "tour-speaker",
    },{
        content: "<p>Click here to check if your answer</p>",
        title: "",
        target: "#progress",
        order: "1",
        group: "tour-doer",
    },{
        content: "<p>You need to crack the riddle before time is up</p>",
        title: "",
        target: "#timer_section",
        order: "2",
        group: "tour-doer",
    },{
        content: "<p>Good luck! Have fun</p>",
        title: "",
        target: "#submit_section",
        order: "3",
        group: "tour-doer",
    }];
    const tg = new tourguide.TourGuideClient({
        exitOnClickOutside: true,
        steps: isSpeaker? stepsForSpeaker : stepsForDoer
    });
    tg.start();
});