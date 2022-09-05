// @ts-ignore
import Board from '@asseinfo/react-kanban';
import '@asseinfo/react-kanban/dist/styles.css';
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api'

type TBoard = {
  columns: [TColumn];
}

type TColumn = {
  id: number;
  title: string;
  cards: [TCard];
}

type TCard = {
  id: number;
  title: string;
  description: string | undefined;
}

type TMovedFrom = {
  fromColumnId: number;
  fromPosition: number;
}

type TMovedTo = {
  toColumnId: number;
  toPosition: number;
}

class CardPos {
  columnId: number;
  position: number;

  constructor(columnId: number, position: number) {
    this.columnId = columnId;
    this.position = position;
  }
}

async function handleAddCard(board: TBoard, column: TColumn, card: TCard) {
  const pos = new CardPos(column.id, 0);
  await invoke<void>("handle_add_card", { "card": card, "pos": pos })
};

async function handleMoveCard(board: TBoard, card: TCard, from: TMovedFrom, to: TMovedTo) {
  const fromPos = new CardPos(from.fromColumnId, from.fromPosition);
  const toPos = new CardPos(to.toColumnId, to.toPosition);
  await invoke<void>("handle_move_card", { "card": card, "from": fromPos, "to": toPos })
}

async function handleRemoveCard(board: TBoard, column: TColumn, card: TCard) {
  await invoke<void>("handle_remove_card", { "card": card, "columnId": column.id })
};

function App() {
  const [board, setBoard] = useState<TBoard | null>(null);

  useEffect(() => {
    (async () => {
      const board = await invoke<TBoard>("get_board", {})
        .catch(err => {
          console.error(err);
          return null
        });
      console.debug(board);
      setBoard(board);
    })();
  }, []);

  return (
    <>
      {board != null &&
        <Board
          initialBoard={board}
          allowAddCard={{ on: "top" }}
          allowRemoveCard
          disableColumnDrag
          onNewCardConfirm={(draftCard: any) => ({
            id: new Date().getTime(),
            ...draftCard
          })}
          onCardNew={handleAddCard}
          onCardDragEnd={handleMoveCard}
          onCardRemove={handleRemoveCard}
        />}
    </>
  )
}

export default App;
