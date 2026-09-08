import Game from '@/components/Game';

const GameComponent = Game as unknown as React.ComponentType;

export default function Home() {
  return <GameComponent />;
}