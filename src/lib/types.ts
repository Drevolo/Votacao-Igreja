export type Election = {
  id: string
  owner_id: string
  title: string
  created_at: string
}

export type Group = {
  id: string
  election_id: string
  name: string
  slug: string
  created_at: string
}

export type Candidate = {
  id: string
  group_id: string
  name: string
  created_at: string
  archived: boolean
}

export type VoteRound = {
  id: string
  group_id: string
  number: number
  is_open: boolean
  opened_at: string | null
  closed_at: string | null
  created_at: string
}

export type ResultRow = {
  round_id: string
  round_number: number
  is_open: boolean
  candidate_id: string
  candidate_name: string
  votes: number
}

export type VotingGroup = {
  group: {
    id: string
    name: string
    election_title: string
  }
  open: boolean
  candidates: Array<{ id: string; name: string }>
}

export type CastVoteResult = {
  ok: boolean
  error?: 'closed' | 'duplicate' | 'invalid_email' | 'invalid_candidate' | 'too_many'
  round?: number
}
