import { wordRepository } from "../repositories/word.repository";

export const buryWordService = async (id: number) => {
  if (!id) throw new Error("Invalid ID");

  return await wordRepository.buryWord(id);
};