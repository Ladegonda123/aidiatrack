export const getChatRoomId = (idA: number, idB: number): string => {
  const [a, b] = [idA, idB].sort((x, y) => x - y);
  return `chat_${a}_${b}`;
};
