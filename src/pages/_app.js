import { Provider } from 'react-redux';
import { store } from '@/app/store';
import KadenaProvider from '@/kadena/components/KadenaProvider';

function MyApp({ Component, pageProps }) {
  return (
    <Provider store={store}>
      <KadenaProvider>
        <Component {...pageProps} />
      </KadenaProvider>
    </Provider>
  );
}

export default MyApp;
