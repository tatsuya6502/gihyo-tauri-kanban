// @ts-ignore
import Board from '@asseinfo/react-kanban';
import '@asseinfo/react-kanban/dist/styles.css';
// Reactが提供する関数をインポートする
import { useState, useEffect } from 'react';
// Tauriが提供するinvoke関数をインポートする
import { invoke } from '@tauri-apps/api'

// 必須ではないが、かんばんボードを表す型（TBoard, TColumn, TCard等）を定義する

// ボードを表す型定義
type TBoard = {
  columns: [TColumn];
}

// カラムを表す型定義
type TColumn = {
  id: number;
  title: string;
  cards: [TCard];
}

// カードを表す型定義
type TCard = {
  id: number;
  title: string;
  description: string | undefined;
}

// カードの移動元を表す型定義
type TMovedFrom = {
  fromColumnId: number;
  fromPosition: number;
}

// カードの移動先を表す型定義
type TMovedTo = {
  toColumnId: number;
  toPosition: number;
}

// カードの位置を表すクラス
class CardPos {
  columnId: number;
  position: number;

  constructor(columnId: number, position: number) {
    this.columnId = columnId;
    this.position = position;
  }
}

// カードの追加直後に呼ばれるハンドラ
async function handleAddCard(board: TBoard, column: TColumn, card: TCard) {
  const pos = new CardPos(column.id, 0);
  // IPCでCoreプロセスのhandle_add_cardを呼ぶ（引数はJSON形式）
  await invoke<void>("handle_add_card", { "card": card, "pos": pos })
};

// カードの移動直後に呼ばれるハンドラ
async function handleMoveCard(board: TBoard, card: TCard, from: TMovedFrom, to: TMovedTo) {
  const fromPos = new CardPos(from.fromColumnId, from.fromPosition);
  const toPos = new CardPos(to.toColumnId, to.toPosition);
  await invoke<void>("handle_move_card", { "card": card, "from": fromPos, "to": toPos })
}

// カードの削除直後に呼ばれるハンドラ
async function handleRemoveCard(board: TBoard, column: TColumn, card: TCard) {
  await invoke<void>("handle_remove_card", { "card": card, "columnId": column.id })
};

function App() {
  const [board, setBoard] = useState<TBoard | null>(null);

  // ボードのデータを取得する
  useEffect(() => {
    (async () => {
      // IPCでCoreプロセスのget_boardを呼ぶ
      const board = await invoke<TBoard>("get_board", {})
        // 例外が発生したらその旨コンソールに表示する
        .catch(err => {
          console.error(err);
          return null
        });
      console.debug(board);
      // ボードのデータをかんばんボードにセットする
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
