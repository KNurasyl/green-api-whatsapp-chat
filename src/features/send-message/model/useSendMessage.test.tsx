import { useEffect, type PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ChatProvider, findChat, useChatStore, useChatStoreApi } from '@/entities/chat'
import { useSession } from '@/entities/session'
import { apiError } from '@/shared/api'
import { sendMessage } from '../api/sendMessage'
import { MessageComposer } from '../ui/MessageComposer'

vi.mock('../api/sendMessage', () => ({ sendMessage: vi.fn() }))

const firstChat = '79990000000@c.us'
const secondChat = '79991111111@c.us'
const client = new QueryClient()

const Wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={client}>
    <ChatProvider>{children}</ChatProvider>
  </QueryClientProvider>
)

const Conversation = ({ chatId }: { chatId: string | null }) => {
  const store = useChatStoreApi()
  const chat = useChatStore((state) => (chatId ? findChat(state.chats, chatId) : undefined))

  useEffect(() => {
    store.getState().openChat({ apiChatId: firstChat })
    store.getState().openChat({ apiChatId: secondChat })
  }, [store])

  return chat ? <MessageComposer chat={chat} /> : null
}

const submit = (text: string) => {
  fireEvent.change(screen.getByRole('textbox', { name: 'Сообщение' }), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Отправить' }))
}

beforeEach(() => {
  useSession.getState().open(
    {
      apiUrl: 'https://api.green-api.com',
      idInstance: '123',
      apiTokenInstance: 'test-token',
    },
    'test-session',
  )
})

afterEach(() => {
  cleanup()
  useSession.getState().close()
  client.clear()
  vi.resetAllMocks()
})

it('keeps an uncertain send visible after leaving and reopening the chat', async () => {
  let rejectSend: (reason: Error) => void = () => {}
  vi.mocked(sendMessage).mockReturnValue(
    new Promise<string>((_, reject) => {
      rejectSend = reject
    }),
  )
  const { rerender } = render(<Conversation chatId={firstChat} />, { wrapper: Wrapper })
  submit('Проверить отправку')
  await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1))

  rerender(<Conversation chatId={null} />)
  await act(() => {
    rejectSend(apiError('network', 'Нет ответа'))
    return Promise.resolve()
  })
  rerender(<Conversation chatId={firstChat} />)

  expect((await screen.findByRole('alert')).textContent).toContain('Сообщение могло уйти')
  expect(screen.getByRole('textbox', { name: 'Сообщение' })).toHaveProperty(
    'value',
    'Проверить отправку',
  )
  expect(sendMessage).toHaveBeenCalledTimes(1)

  rerender(<Conversation chatId={secondChat} />)
  expect(screen.queryByRole('alert')).toBeNull()
  rerender(<Conversation chatId={firstChat} />)
  expect(screen.getByRole('alert').textContent).toContain('Сообщение могло уйти')
})

it('replaces the previous attempt only when the user sends again', async () => {
  vi.mocked(sendMessage)
    .mockRejectedValueOnce(apiError('timeout', 'Нет ответа'))
    .mockResolvedValueOnce('sent-message')
  const { rerender } = render(<Conversation chatId={firstChat} />, { wrapper: Wrapper })
  submit('Первое сообщение')
  await screen.findByRole('alert')

  rerender(<Conversation chatId={secondChat} />)
  vi.mocked(sendMessage).mockResolvedValueOnce('another-message')
  submit('Другой разговор')
  await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(2))
  rerender(<Conversation chatId={firstChat} />)
  expect((await screen.findByRole('alert')).textContent).toContain('Сообщение могло уйти')

  submit('Повторить после проверки')
  await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(3))
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  expect(screen.getByRole('textbox', { name: 'Сообщение' })).toHaveProperty('value', '')
  expect(client.getMutationCache().findAll({ mutationKey: ['send', 'test-session'] })).toHaveLength(
    2,
  )
})
