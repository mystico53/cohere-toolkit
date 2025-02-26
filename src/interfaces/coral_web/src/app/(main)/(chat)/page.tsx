import { NextPage } from 'next';
import ChunkedMessagesDebug from "../../../components/ChunkedMessagesDebug";
import Chat from '@/app/(main)/(chat)/Chat';

const Page: NextPage = () => {
  return (
    <>
      <Chat />
      <ChunkedMessagesDebug />
    </>
  );
};

export default Page;