// Receipt.jsx — printable receipt page. Reads ?id= and ?token= from URL.
const { useState: useStateRc, useEffect: useEffectRc } = React;

function Receipt({ lang, c }) {
  const isKo = lang === 'ko';
  const [data, setData] = useStateRc(null);
  const [loading, setLoading] = useStateRc(true);
  const [err, setErr] = useStateRc('');

  useEffectRc(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const token = params.get('token');
    if (!id) { setErr(isKo ? '영수증 ID가 없습니다.' : 'Missing receipt ID.'); setLoading(false); return; }
    (async () => {
      try {
        const res = await window.DreamPathAuth.authFetch(
          '/api/applications/' + encodeURIComponent(id) + '/receipt' + (token ? '?token=' + encodeURIComponent(token) : '')
        );
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          if (d.error === 'unauthorized') setErr(isKo ? '권한이 없습니다. 토큰 또는 로그인을 확인해주세요.' : 'Unauthorized. Check the token or log in.');
          else if (d.error === 'not_paid') setErr(isKo ? '결제가 완료된 지원에 대해서만 영수증이 발급됩니다.' : 'Receipts are only issued for paid applications.');
          else setErr(isKo ? '영수증을 불러올 수 없습니다.' : 'Could not load receipt.');
          setLoading(false);
          return;
        }
        setData(await res.json());
      } catch (e) {
        setErr(String(e.message || e));
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{padding:80,textAlign:'center',color:'var(--fg-muted)'}}>{isKo ? '불러오는 중…' : 'Loading…'}</div>;
  if (err) return (
    <div style={{padding:80,textAlign:'center',maxWidth:520,margin:'0 auto'}}>
      <h1 style={{fontFamily:'var(--font-en)',color:'var(--midnight-purple)'}}>{isKo ? '영수증' : 'Receipt'}</h1>
      <p style={{color:'var(--state-danger)',marginTop:16}}>{err}</p>
    </div>
  );
  if (!data) return null;

  const dateStr = data.paid_at ? new Date(data.paid_at).toLocaleString(isKo ? 'ko-KR' : 'en-US') : '—';
  const amount = data.amount;
  const currency = data.currency || 'USD';
  const symbol = currency === 'USD' ? '$' : '';

  return (
    <div className="receipt-page">
      <div className="receipt-actions no-print">
        <button className="btn btn-primary" onClick={() => window.print()}>
          {isKo ? '인쇄 / PDF 저장' : 'Print / Save as PDF'}
        </button>
      </div>
      <div className="receipt-paper">
        <header className="receipt-head">
          <div>
            <div className="receipt-brand">KoreaDream<span style={{color:'#FFD400'}}>Path</span></div>
            <div className="receipt-issuer">{data.issuer.name}<br/>{data.issuer.email}</div>
          </div>
          <div className="receipt-meta">
            <div className="receipt-label">{isKo ? '영수증 / RECEIPT' : 'OFFICIAL RECEIPT'}</div>
            <div className="receipt-id">#{data.id}</div>
            <div className="receipt-date">{dateStr}</div>
          </div>
        </header>

        <section className="receipt-section">
          <h3>{isKo ? '결제자' : 'Billed to'}</h3>
          <div className="receipt-payer">
            <div><strong>{data.payer.name}</strong></div>
            <div>{data.payer.email}</div>
            {data.payer.country && <div>{data.payer.country}</div>}
          </div>
        </section>

        <section className="receipt-section">
          <h3>{isKo ? '구매 내역' : 'Order'}</h3>
          <table className="receipt-table">
            <thead>
              <tr>
                <th>{isKo ? '항목' : 'Item'}</th>
                <th style={{textAlign:'right'}}>{isKo ? '금액' : 'Amount'}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div><strong>{data.program || '—'}</strong></div>
                  <div style={{color:'var(--fg-muted)',fontSize:13}}>{isKo ? '트랙' : 'Track'}: {data.track || '—'}</div>
                </td>
                <td style={{textAlign:'right'}}>{symbol}{amount}.00 {currency !== 'USD' && currency}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td style={{borderTop:'2px solid #333',paddingTop:12,fontWeight:700}}>{isKo ? '합계' : 'Total'}</td>
                <td style={{borderTop:'2px solid #333',paddingTop:12,textAlign:'right',fontWeight:700,fontSize:18}}>{symbol}{amount}.00 {currency}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="receipt-section">
          <h3>{isKo ? '결제 정보' : 'Payment'}</h3>
          <div>
            <div>{isKo ? '결제 수단' : 'Method'}: {data.payment.method === 'card' ? (isKo ? '신용카드' : 'Credit card') : data.payment.method}</div>
            {data.payment.card_last4 && <div>{isKo ? '카드' : 'Card'}: •••• {data.payment.card_last4}</div>}
            <div>{isKo ? '상태' : 'Status'}: <span style={{color:'var(--state-success)',fontWeight:700}}>{isKo ? '결제 완료' : 'PAID'}</span></div>
          </div>
        </section>

        <footer className="receipt-foot">
          <p>{isKo
            ? '본 영수증은 온라인으로 발급된 전자 영수증입니다. 문의는 info@koreadreampath.com 으로 연락주세요.'
            : 'This is an electronic receipt issued online. For inquiries, contact info@koreadreampath.com.'}</p>
          <p style={{marginTop:8,fontSize:11,color:'var(--fg-muted)'}}>KoreaDreamPath · Generated {new Date().toISOString()}</p>
        </footer>
      </div>
    </div>
  );
}

window.Receipt = Receipt;
