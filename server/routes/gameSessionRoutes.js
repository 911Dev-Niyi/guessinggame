import express from 'express';
import {
    createSession,
    joinSession,
    startGame,
    submitGuess,
    endRound,
    leaveSession,
    getLeaderboard,
    getSessionInfo
} from '../controllers/gameSessionController.js';

const router = express.Router();
// Create a new game session
router.post('/create', createSession);
router.post('/join', joinSession);
router.post('/start', startGame);
router.post('/guess', submitGuess);
router.post('/end-round', endRound);
router.post('/leave', leaveSession);
router.get('/leaderboard/;sessionId', getLeaderboard)
router.get('/:sessionId', getSessionInfo);


export default router;

