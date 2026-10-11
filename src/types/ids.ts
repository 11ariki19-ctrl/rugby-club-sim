// 一意ID。文字列だが、種類を取り違えないよう型で区別する。
export type PlayerId = string & { readonly __brand: 'PlayerId' };
export type SchoolId = string & { readonly __brand: 'SchoolId' };
export type TournamentId = string & { readonly __brand: 'TournamentId' };
export type MatchId = string & { readonly __brand: 'MatchId' };

export const asPlayerId = (s: string) => s as PlayerId;
export const asSchoolId = (s: string) => s as SchoolId;
export const asTournamentId = (s: string) => s as TournamentId;
export const asMatchId = (s: string) => s as MatchId;
