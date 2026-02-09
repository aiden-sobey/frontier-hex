import { useState } from 'react'
import { useGameStore } from '~/stores/game-store'
import { useUIStore } from '~/stores/ui-store'
import { useGameActions } from '~/hooks/useGameActions'
import { Modal } from '~/components/ui/Modal'
import { Button } from '~/components/ui/Button'
import { ResourceType, GamePhase } from '~/engine/types'
import type { ResourceBundle, GameAction } from '~/engine/types'
import { RESOURCE_TYPES, EMPTY_RESOURCES } from '~/engine/constants'
import { getTradeRatio } from '~/engine/trade-ratios'

const RESOURCE_ICONS: Record<ResourceType, string> = {
  [ResourceType.Wood]: '\u{1FAB5}',
  [ResourceType.Brick]: '\u{1F9F1}',
  [ResourceType.Sheep]: '\u{1F411}',
  [ResourceType.Wheat]: '\u{1F33E}',
  [ResourceType.Ore]: '\u26CF\uFE0F',
}

const RESOURCE_LABELS: Record<ResourceType, string> = {
  [ResourceType.Wood]: 'Wood',
  [ResourceType.Brick]: 'Brick',
  [ResourceType.Sheep]: 'Sheep',
  [ResourceType.Wheat]: 'Wheat',
  [ResourceType.Ore]: 'Ore',
}

interface TradeDialogProps {
  sendAction?: (action: GameAction) => Promise<{ success: boolean; error?: string }>
}

type TradeTab = 'bank' | 'player'

export function TradeDialog({ sendAction }: TradeDialogProps) {
  const gameState = useGameStore((s) => s.gameState)
  const clientState = useGameStore((s) => s.clientState)
  const myPlayerIndex = useGameStore((s) => s.myPlayerIndex)
  const showTradeDialog = useUIStore((s) => s.showTradeDialog)
  const setShowTradeDialog = useUIStore((s) => s.setShowTradeDialog)
  const actions = useGameActions(sendAction)

  const [tab, setTab] = useState<TradeTab>('bank')
  const [bankGive, setBankGive] = useState<ResourceType>(ResourceType.Wood)
  const [bankReceive, setBankReceive] = useState<ResourceType>(ResourceType.Brick)
  const [offering, setOffering] = useState<ResourceBundle>({ ...EMPTY_RESOURCES })
  const [requesting, setRequesting] = useState<ResourceBundle>({ ...EMPTY_RESOURCES })

  const state = gameState ?? clientState
  if (!state || myPlayerIndex === null) return null

  const player = state.players[myPlayerIndex]
  const isMyTurn = state.currentPlayerIndex === myPlayerIndex
  const isMain = state.phase === GamePhase.Main
  const pendingTrade = state.pendingTrade

  // Bank trade ratios
  function getRatio(resource: ResourceType): number {
    if (gameState) return getTradeRatio(gameState, myPlayerIndex!, resource)
    // For client state, approximate from player ports
    return 4 // Fallback
  }

  function handleBankTrade() {
    if (bankGive === bankReceive) return
    actions.tradeBank(bankGive, bankReceive)
  }

  function handlePlayerOffer() {
    actions.tradeOffer(offering, requesting)
    setOffering({ ...EMPTY_RESOURCES })
    setRequesting({ ...EMPTY_RESOURCES })
  }

  function adjustResource(
    bundle: ResourceBundle,
    setter: (b: ResourceBundle) => void,
    resource: ResourceType,
    delta: number,
  ) {
    const newVal = Math.max(0, bundle[resource] + delta)
    setter({ ...bundle, [resource]: newVal })
  }

  function handleClose() {
    setShowTradeDialog(false)
    setOffering({ ...EMPTY_RESOURCES })
    setRequesting({ ...EMPTY_RESOURCES })
  }

  return (
    <Modal open={showTradeDialog} onClose={handleClose} title="Trade">
      {/* Pending trade from another player */}
      {pendingTrade && pendingTrade.fromPlayer !== myPlayerIndex && (
        <div className="mb-4 p-3 bg-gray-700 rounded">
          <p className="text-sm font-medium mb-2">
            {state.players[pendingTrade.fromPlayer].name} wants to trade:
          </p>
          <div className="flex items-center gap-4 text-sm mb-2">
            <div>
              <span className="text-gray-400">Offering: </span>
              {RESOURCE_TYPES.filter((r) => pendingTrade.offering[r] > 0).map((r) => (
                <span key={r} className="mr-2">
                  {RESOURCE_ICONS[r]} {pendingTrade.offering[r]}
                </span>
              ))}
            </div>
            <div>
              <span className="text-gray-400">Wants: </span>
              {RESOURCE_TYPES.filter((r) => pendingTrade.requesting[r] > 0).map((r) => (
                <span key={r} className="mr-2">
                  {RESOURCE_ICONS[r]} {pendingTrade.requesting[r]}
                </span>
              ))}
            </div>
          </div>
          {!pendingTrade.responses[myPlayerIndex] && (
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => actions.tradeAccept()}>
                Accept
              </Button>
              <Button variant="danger" onClick={() => actions.tradeReject()}>
                Reject
              </Button>
            </div>
          )}
          {pendingTrade.responses[myPlayerIndex] && (
            <p className="text-xs text-gray-400">
              You {pendingTrade.responses[myPlayerIndex]}ed this offer.
            </p>
          )}
        </div>
      )}

      {/* Pending trade we sent */}
      {pendingTrade && pendingTrade.fromPlayer === myPlayerIndex && (
        <div className="mb-4 p-3 bg-gray-700 rounded">
          <p className="text-sm font-medium mb-2">Your trade offer is pending...</p>
          <div className="text-xs text-gray-400 mb-2">
            {state.players.map((p, i) => {
              if (i === myPlayerIndex) return null
              const response = pendingTrade.responses[i]
              return (
                <div key={i}>
                  {p.name}: {response ?? 'waiting...'}
                </div>
              )
            })}
          </div>
          <div className="flex gap-2">
            {Object.entries(pendingTrade.responses)
              .filter(([, r]) => r === 'accept')
              .map(([idx]) => (
                <Button
                  key={idx}
                  variant="primary"
                  onClick={() => actions.tradeConfirm(Number(idx))}
                >
                  Trade with {state.players[Number(idx)].name}
                </Button>
              ))}
            <Button variant="danger" onClick={() => actions.tradeCancel()}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Tab selector */}
      {isMyTurn && isMain && !pendingTrade && (
        <>
          <div className="flex mb-3 border-b border-gray-700">
            <button
              className={`px-4 py-2 text-sm font-medium cursor-pointer ${
                tab === 'bank'
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              onClick={() => setTab('bank')}
            >
              Bank Trade
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium cursor-pointer ${
                tab === 'player'
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              onClick={() => setTab('player')}
            >
              Player Trade
            </button>
          </div>

          {tab === 'bank' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Give</label>
                <div className="flex gap-1">
                  {RESOURCE_TYPES.map((r) => {
                    const ratio = getRatio(r)
                    const hasEnough = player.resources[r] >= ratio
                    return (
                      <button
                        key={r}
                        className={`px-2 py-1 rounded text-sm cursor-pointer ${
                          bankGive === r
                            ? 'bg-amber-600 text-white'
                            : hasEnough
                              ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                              : 'bg-gray-800 text-gray-500'
                        }`}
                        onClick={() => setBankGive(r)}
                      >
                        {RESOURCE_ICONS[r]} {ratio}:1
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Receive</label>
                <div className="flex gap-1">
                  {RESOURCE_TYPES.filter((r) => r !== bankGive).map((r) => (
                    <button
                      key={r}
                      className={`px-2 py-1 rounded text-sm cursor-pointer ${
                        bankReceive === r
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                      }`}
                      onClick={() => setBankReceive(r)}
                    >
                      {RESOURCE_ICONS[r]} {RESOURCE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                variant="primary"
                disabled={
                  bankGive === bankReceive ||
                  player.resources[bankGive] < getRatio(bankGive)
                }
                onClick={handleBankTrade}
              >
                Trade with Bank
              </Button>
            </div>
          )}

          {tab === 'player' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">You offer</label>
                <div className="flex gap-2">
                  {RESOURCE_TYPES.map((r) => (
                    <div key={r} className="flex flex-col items-center gap-1">
                      <span className="text-sm">{RESOURCE_ICONS[r]}</span>
                      <div className="flex items-center gap-1">
                        <button
                          className="w-5 h-5 rounded bg-gray-700 text-xs hover:bg-gray-600 cursor-pointer"
                          onClick={() => adjustResource(offering, setOffering, r, -1)}
                        >
                          -
                        </button>
                        <span className="text-sm w-4 text-center">{offering[r]}</span>
                        <button
                          className="w-5 h-5 rounded bg-gray-700 text-xs hover:bg-gray-600 cursor-pointer"
                          onClick={() => adjustResource(offering, setOffering, r, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">You request</label>
                <div className="flex gap-2">
                  {RESOURCE_TYPES.map((r) => (
                    <div key={r} className="flex flex-col items-center gap-1">
                      <span className="text-sm">{RESOURCE_ICONS[r]}</span>
                      <div className="flex items-center gap-1">
                        <button
                          className="w-5 h-5 rounded bg-gray-700 text-xs hover:bg-gray-600 cursor-pointer"
                          onClick={() =>
                            adjustResource(requesting, setRequesting, r, -1)
                          }
                        >
                          -
                        </button>
                        <span className="text-sm w-4 text-center">{requesting[r]}</span>
                        <button
                          className="w-5 h-5 rounded bg-gray-700 text-xs hover:bg-gray-600 cursor-pointer"
                          onClick={() =>
                            adjustResource(requesting, setRequesting, r, 1)
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="primary" onClick={handlePlayerOffer}>
                Propose Trade
              </Button>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
