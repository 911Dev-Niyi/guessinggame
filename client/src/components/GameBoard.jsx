const GameBoard = ({ question, guess, setGuess, handleSubmitGuess, timeLeft, roundResult }) => (
  <div>
    {question && <h3>Question: {question}</h3>}
    {timeLeft !== null && <h4>Time left: {timeLeft} seconds</h4>}
    <input
      type="text"
      placeholder="Your guess"
      value={guess}
      onChange={(e) => setGuess(e.target.value)}
      style={{ padding: '0.5rem', marginRight: '0.5rem', width: '60%' }}
      disabled={!timeLeft || roundResult}
    />
    <button
      onClick={handleSubmitGuess}
      style={{ padding: '0.5rem 1rem' }}
      disabled={!timeLeft || roundResult}
    >
      Submit Guess
    </button>
  </div>
);

export default GameBoard;
