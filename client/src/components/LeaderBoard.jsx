const Leaderboard = ({ leaderboard }) => (
  <div>
    <h3>Leaderboard</h3>
    <ul>
      {leaderboard.map((p, i) => (
        <li key={i}>{p.username}: {p.score}</li>
      ))}
    </ul>
  </div>
);

export default Leaderboard;
