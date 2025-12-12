import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2, Save, X, Package, Zap, TrendingUp, PieChart, FileText, ShoppingCart, Activity, ArrowUp, ArrowDown, Minus, RefreshCw } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('inventory');
  const [cards, setCards] = useState([]);
  const [sales, setSales] = useState([]);
  const [pillars, setPillars] = useState({ federal: 0, state: 0, charity: 0, playerDev: 0, rnd: 0, operations: 0, profit: 0 });
  const [oracleData, setOracleData] = useState({ crypto: { score: 50, sentiment: 'neutral', trend: 'stable' }, digital: { score: 50, sentiment: 'neutral', trend: 'stable' }, physical: { score: 50, sentiment: 'neutral', trend: 'stable' } });
  const [marketPhase, setMarketPhase] = useState('stabilize');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showSaleForm, setShowSaleForm] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newCard, setNewCard] = useState({ name: '', type: 'Pokemon', condition: 'Near Mint', costBasis: '', avgPrice: '', pricingMode: 'markup', markup: 0.05, customPrice: '', profileUrl: '', deliveryType: 'Digital' });

  const cardTypes = ['Pokemon', 'Magic: The Gathering', 'Yu-Gi-Oh!', 'Baseball', 'Basketball', 'Football', 'Digital', 'Other'];
  const conditions = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Played', 'Poor'];

  useEffect(() => {
    loadData();
    updateOracle();
    const int = setInterval(updateOracle, 300000);
    return () => clearInterval(int);
  }, []);

  const updateOracle = () => {
    const gen = () => {
      const s = Math.max(0, Math.min(100, 40 + Math.random() * 40 + (Math.random() * 20 - 10)));
      return { score: Math.round(s), sentiment: s > 70 ? 'bullish' : s < 30 ? 'bearish' : 'neutral', trend: s > 60 ? 'rising' : s < 40 ? 'falling' : 'stable' };
    };
    const d = { crypto: gen(), digital: gen(), physical: gen() };
    setOracleData(d);
    const avg = (d.crypto.score + d.digital.score + d.physical.score) / 3;
    const r = [d.crypto.trend, d.digital.trend, d.physical.trend].filter(t => t === 'rising').length;
    const f = [d.crypto.trend, d.digital.trend, d.physical.trend].filter(t => t === 'falling').length;
    let p = 'stabilize';
    if (avg > 75 && r >= 2) p = 'pump';
    else if (avg > 60 && r >= 2) p = 'hype';
    else if (avg < 30 && f >= 2) p = 'dump';
    else if (avg < 40 && f >= 2) p = 'drop';
    else if (avg < 45) p = 'crawl';
    else if (avg > 55 && r >= 1) p = 'climb';
    setMarketPhase(p);
  };

  const loadData = async () => {
    try {
      const cr = await window.storage.list('card:');
      if (cr?.keys) {
        const cd = await Promise.all(cr.keys.map(async (k) => {
          const d = await window.storage.get(k);
          return d ? JSON.parse(d.value) : null;
        }));
        setCards(cd.filter(Boolean));
      }
      const sr = await window.storage.list('sale:');
      if (sr?.keys) {
        const sd = await Promise.all(sr.keys.map(async (k) => {
          const d = await window.storage.get(k);
          return d ? JSON.parse(d.value) : null;
        }));
        setSales(sd.filter(Boolean));
      }
      try {
        const pd = await window.storage.get('pillars');
        if (pd) setPillars(JSON.parse(pd.value));
      } catch (e) {}
    } catch (e) {}
  };

  const saveCard = async (c) => {
    const id = c.id || `card_${Date.now()}`;
    const cs = { ...c, id, status: c.status || 'available' };
    await window.storage.set(`card:${id}`, JSON.stringify(cs));
    return cs;
  };

  const deleteCard = async (id) => {
    await window.storage.delete(`card:${id}`);
    setCards(cards.filter(c => c.id !== id));
  };

  const handleAdd = async () => {
    if (newCard.name && newCard.avgPrice && newCard.costBasis) {
      const sc = await saveCard(newCard);
      setCards([...cards, sc]);
      setNewCard({ name: '', type: 'Pokemon', condition: 'Near Mint', costBasis: '', avgPrice: '', pricingMode: 'markup', markup: 0.05, customPrice: '', profileUrl: '', deliveryType: 'Digital' });
      setShowAddForm(false);
    }
  };

  const handleUpdate = async (id, u) => {
    const sc = await saveCard(u);
    setCards(cards.map(c => c.id === id ? sc : c));
    setEditingId(null);
  };

  const handleSale = async (c, sd) => {
    const nr = sd.salePrice - parseFloat(c.costBasis) - sd.posFees;
    const d = { federal: nr * 0.10, state: nr * 0.10, charity: nr * 0.10, playerDev: nr * 0.10, rnd: nr * 0.20, operations: nr * 0.20, profit: nr * 0.20 };
    const np = { federal: pillars.federal + d.federal, state: pillars.state + d.state, charity: pillars.charity + d.charity, playerDev: pillars.playerDev + d.playerDev, rnd: pillars.rnd + d.rnd, operations: pillars.operations + d.operations, profit: pillars.profit + d.profit };
    await window.storage.set('pillars', JSON.stringify(np));
    setPillars(np);
    const s = { id: `sale_${Date.now()}`, cardId: c.id, cardName: c.name, cardType: c.type, costBasis: parseFloat(c.costBasis), salePrice: sd.salePrice, posFees: sd.posFees, netRevenue: nr, distribution: d, customerType: sd.customerType, customerTaxId: sd.customerTaxId || '', saleDate: new Date().toISOString(), marketPhaseAtSale: marketPhase };
    await window.storage.set(`sale:${s.id}`, JSON.stringify(s));
    setSales([...sales, s]);
    const uc = { ...c, status: 'sold', soldDate: s.saleDate };
    await saveCard(uc);
    setCards(cards.map(cc => cc.id === c.id ? uc : cc));
    setShowSaleForm(null);
  };

  const calcPrice = (c) => {
    if (c.pricingMode === 'custom' && c.customPrice) return parseFloat(c.customPrice).toFixed(2);
    return (parseFloat(c.avgPrice) + parseFloat(c.markup)).toFixed(2);
  };

  const getColor = (p) => {
    const cols = { hype: 'from-yellow-400 to-orange-500', pump: 'from-red-500 to-pink-600', dump: 'from-red-600 to-red-800', drop: 'from-gray-600 to-gray-800', crawl: 'from-blue-300 to-blue-400', stabilize: 'from-green-400 to-green-500', climb: 'from-emerald-400 to-teal-500' };
    return cols[p] || 'from-gray-400 to-gray-500';
  };

  const getRec = (p) => {
    const r = { hype: { action: 'CAUTION', text: 'Early excitement' }, pump: { action: 'SELL', text: 'Take profits' }, dump: { action: 'HOLD/SELL', text: 'Avoid buying' }, drop: { action: 'WAIT', text: 'Wait for bottom' }, crawl: { action: 'WATCH', text: 'Start watchlist' }, stabilize: { action: 'BUY', text: 'Best buy' }, climb: { action: 'BUY/HOLD', text: 'Good entry' } };
    return r[p] || { action: 'NEUTRAL', text: 'Monitor' };
  };

  const avg = Math.round((oracleData.crypto.score + oracleData.digital.score + oracleData.physical.score) / 3);
  const rec = getRec(marketPhase);
  const filt = cards.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const avail = filt.filter(c => c.status === 'available');
  const sold = filt.filter(c => c.status === 'sold');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="flex">
        {/* Mobile Oracle Toggle Button */}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-4 left-4 z-50 lg:hidden bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700"
          aria-label="Toggle Oracle"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeWidth="2"/>
          </svg>
        </button>

        {/* Sidebar Overlay for Mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed left-0 top-0 w-80 h-screen bg-white shadow-2xl overflow-y-auto p-4 z-40 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Activity size={20} className="text-purple-600" />Market Oracle</h2>
            <div className="flex gap-2">
              <button onClick={updateOracle} className="p-2 bg-blue-100 text-blue-600 rounded-lg"><RefreshCw size={16} /></button>
              <button onClick={() => setSidebarOpen(false)} className="p-2 bg-gray-100 text-gray-600 rounded-lg lg:hidden">
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            {[{ t: 'Crypto', o: oracleData.crypto, i: '₿' }, { t: 'Digital', o: oracleData.digital, i: '🎨' }, { t: 'Physical', o: oracleData.physical, i: '🃏' }].map(({ t, o, i }) => (
              <div key={t} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2"><span className="text-lg">{i}</span><span className="text-sm font-semibold">{t}</span></div>
                  {o.trend === 'rising' ? <ArrowUp className="text-green-600" size={14} /> : o.trend === 'falling' ? <ArrowDown className="text-red-600" size={14} /> : <Minus className="text-gray-600" size={14} />}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold">{o.score}</span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${o.sentiment === 'bullish' ? 'bg-green-100 text-green-700' : o.sentiment === 'bearish' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{o.sentiment.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
          <div className={`bg-gradient-to-r ${getColor(marketPhase)} p-4 rounded-lg text-white mb-4`}>
            <p className="text-xs opacity-90 mb-1">Market Phase</p>
            <p className="text-2xl font-bold uppercase mb-2">{marketPhase}</p>
            <p className="text-xs opacity-95 mb-2">{rec.text}</p>
            <div className="bg-white bg-opacity-20 px-3 py-1 rounded text-center"><p className="text-sm font-bold">{rec.action}</p></div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600 mb-2">Overall Health</p>
            <div className="flex items-end gap-2"><p className="text-4xl font-bold">{avg}</p><p className="text-sm text-gray-500 mb-2">/100</p></div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-2"><div className="h-full bg-gradient-to-r from-green-500 to-blue-500" style={{ width: `${avg}%` }} /></div>
          </div>
        </div>

        <div className="flex-1 p-6 lg:ml-80">
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6 mt-16 lg:mt-0">
            <h1 className="text-4xl font-bold mb-2">Collectibles Marketplace</h1>
            <p className="text-gray-600">Private • Market Intelligence • 7 Pillars</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
            <div className="flex gap-2 flex-wrap">
              {[{ v: 'inventory', i: Package, l: 'Inventory' }, { v: 'dashboard', i: PieChart, l: '7 Pillars' }, { v: 'sales', i: TrendingUp, l: 'Sales' }].map(({ v, i: Icon, l }) => (
                <button key={v} onClick={() => setView(v)} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${view === v ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}><Icon size={18} />{l}</button>
              ))}
            </div>
          </div>

          {view === 'inventory' && (
            <>
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <div className="flex gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <button onClick={() => setShowAddForm(!showAddForm)} className="px-6 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2"><Plus size={20} />Add</button>
                </div>

                {showAddForm && (
                  <div className="mt-6 p-6 bg-gray-50 rounded-lg border-2 border-purple-200">
                    <h3 className="text-xl font-semibold mb-4">Add New Item</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="Name" value={newCard.name} onChange={(e) => setNewCard({ ...newCard, name: e.target.value })} className="px-3 py-2 border rounded-lg" />
                      <select value={newCard.type} onChange={(e) => setNewCard({ ...newCard, type: e.target.value })} className="px-3 py-2 border rounded-lg">{cardTypes.map(t => <option key={t}>{t}</option>)}</select>
                      <select value={newCard.condition} onChange={(e) => setNewCard({ ...newCard, condition: e.target.value })} className="px-3 py-2 border rounded-lg">{conditions.map(c => <option key={c}>{c}</option>)}</select>
                      <select value={newCard.deliveryType} onChange={(e) => setNewCard({ ...newCard, deliveryType: e.target.value })} className="px-3 py-2 border rounded-lg"><option value="Digital">Digital</option><option value="Physical">Physical</option></select>
                      <input type="number" step="0.01" placeholder="Cost Basis" value={newCard.costBasis} onChange={(e) => setNewCard({ ...newCard, costBasis: e.target.value })} className="px-3 py-2 border rounded-lg" />
                      <input type="number" step="0.01" placeholder="Market Price" value={newCard.avgPrice} onChange={(e) => setNewCard({ ...newCard, avgPrice: e.target.value })} className="px-3 py-2 border rounded-lg" />
                      <div className="col-span-2">
                        <div className="flex gap-4 mb-2">
                          <label><input type="radio" value="markup" checked={newCard.pricingMode === 'markup'} onChange={(e) => setNewCard({ ...newCard, pricingMode: e.target.value })} className="mr-2" />Market + Markup</label>
                          <label><input type="radio" value="custom" checked={newCard.pricingMode === 'custom'} onChange={(e) => setNewCard({ ...newCard, pricingMode: e.target.value })} className="mr-2" />Custom Price</label>
                        </div>
                        {newCard.pricingMode === 'markup' ? (
                          <select value={newCard.markup} onChange={(e) => setNewCard({ ...newCard, markup: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-lg">
                            {[0.05, 0.06, 0.07, 0.08, 0.09, 0.10].map(m => <option key={m} value={m}>${m.toFixed(2)}</option>)}
                          </select>
                        ) : (
                          <input type="number" step="0.01" placeholder="Custom Price" value={newCard.customPrice} onChange={(e) => setNewCard({ ...newCard, customPrice: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button onClick={handleAdd} className="px-6 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"><Save size={18} />Save</button>
                      <button onClick={() => setShowAddForm(false)} className="px-6 py-2 bg-gray-500 text-white rounded-lg flex items-center gap-2"><X size={18} />Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              {avail.length > 0 && (
                <>
                  <h2 className="text-2xl font-bold mb-4">Available ({avail.length})</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {avail.map((c) => (
                      <div key={c.id} className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold">{c.name}</h3>
                            <p className="text-sm text-gray-500">{c.type}</p>
                            <div className="flex gap-2 mt-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">{c.condition}</span>
                              {c.pricingMode === 'custom' && <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Custom</span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingId(c.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={18} /></button>
                            <button onClick={() => deleteCard(c.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
                          </div>
                        </div>
                        <div className="border-t pt-4">
                          <div className="flex justify-between mb-2"><span className="text-sm">Cost:</span><span className="font-semibold">${parseFloat(c.costBasis).toFixed(2)}</span></div>
                          {c.pricingMode === 'markup' && <div className="flex justify-between mb-2"><span className="text-sm">Market:</span><span className="font-semibold">${parseFloat(c.avgPrice).toFixed(2)}</span></div>}
                          <div className="flex justify-between pt-2 border-t"><span className="font-semibold">List Price:</span><span className="text-2xl font-bold text-purple-600">${calcPrice(c)}</span></div>
                        </div>
                        <button onClick={() => setShowSaleForm(c)} className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg flex items-center justify-center gap-2"><ShoppingCart size={18} />Record Sale</button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {avail.length === 0 && <div className="bg-white rounded-lg p-12 text-center"><p className="text-gray-500 text-lg">No items. Add your first!</p></div>}
            </>
          )}

          {view === 'dashboard' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6">7 Pillars Account Balances</h2>
              <div className="grid grid-cols-4 gap-4">
                {[['Federal', pillars.federal, 'red', '10%'], ['State', pillars.state, 'orange', '10%'], ['Charity', pillars.charity, 'pink', '10%'], ['Player Dev', pillars.playerDev, 'blue', '10%'], ['R&D', pillars.rnd, 'purple', '20%'], ['Operations', pillars.operations, 'green', '20%'], ['Profit', pillars.profit, 'yellow', '20%']].map(([t, a, c, p]) => (
                  <div key={t} className={`bg-gradient-to-br from-${c}-50 to-${c}-100 p-4 rounded-lg`}>
                    <div className="flex justify-between mb-2"><p className="text-sm font-semibold">{t}</p><span className="text-xs bg-white px-2 py-1 rounded">{p}</span></div>
                    <p className="text-2xl font-bold">${a.toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Summary</h3>
                <p>Total Sales: {sales.length}</p>
                <p>Total Net Revenue: ${sales.reduce((s, sale) => s + sale.netRevenue, 0).toFixed(2)}</p>
              </div>
            </div>
          )}

          {view === 'sales' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6">Sales History</h2>
              {sales.length === 0 ? <p className="text-gray-500 text-center py-8">No sales yet.</p> : (
                <div className="space-y-4">
                  {sales.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate)).map((s) => (
                    <div key={s.id} className="border p-4 rounded-lg">
                      <div className="flex justify-between mb-3">
                        <div><h3 className="font-bold">{s.cardName}</h3><p className="text-sm text-gray-500">{s.cardType} • {new Date(s.saleDate).toLocaleDateString()}</p></div>
                        <div className="text-right"><p className="text-2xl font-bold text-green-600">${s.salePrice.toFixed(2)}</p><p className="text-xs">{s.customerType}</p></div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div><p className="text-gray-500">Cost</p><p className="font-semibold">${s.costBasis.toFixed(2)}</p></div>
                        <div><p className="text-gray-500">Fees</p><p className="font-semibold">${s.posFees.toFixed(2)}</p></div>
                        <div><p className="text-gray-500">Net</p><p className="font-semibold text-green-600">${s.netRevenue.toFixed(2)}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showSaleForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <SaleModal card={showSaleForm} onSave={(sd) => handleSale(showSaleForm, sd)} onCancel={() => setShowSaleForm(null)} calcPrice={calcPrice} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SaleModal({ card, onSave, onCancel, calcPrice }) {
  const [sd, setSd] = useState({ salePrice: parseFloat(calcPrice(card)), posFees: 0, customerType: 'Personal', customerTaxId: '' });
  const nr = sd.salePrice - parseFloat(card.costBasis) - sd.posFees;

  return (
    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Record Sale</h2>
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold mb-2">{card.name}</h3>
        <p className="text-sm">Cost: ${parseFloat(card.costBasis).toFixed(2)} • List: ${calcPrice(card)}</p>
      </div>
      <div className="space-y-4">
        <div><label className="block text-sm font-medium mb-1">Sale Price ($)</label><input type="number" step="0.01" value={sd.salePrice} onChange={(e) => setSd({ ...sd, salePrice: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg" /></div>
        <div><label className="block text-sm font-medium mb-1">POS Fees ($)</label><input type="number" step="0.01" value={sd.posFees} onChange={(e) => setSd({ ...sd, posFees: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg" /></div>
        <div>
          <label className="block text-sm font-medium mb-2">Customer Type</label>
          <div className="space-y-2">
            <label className="flex items-center"><input type="radio" value="Personal" checked={sd.customerType === 'Personal'} onChange={(e) => setSd({ ...sd, customerType: e.target.value })} className="mr-2" /><span className="text-sm">Personal (28% collectibles)</span></label>
            <label className="flex items-center"><input type="radio" value="Business" checked={sd.customerType === 'Business'} onChange={(e) => setSd({ ...sd, customerType: e.target.value })} className="mr-2" /><span className="text-sm">Business (Ordinary income)</span></label>
          </div>
        </div>
        {sd.customerType === 'Business' && <div><label className="block text-sm font-medium mb-1">Tax ID (Optional)</label><input type="text" value={sd.customerTaxId} onChange={(e) => setSd({ ...sd, customerTaxId: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>}
        <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
          <h4 className="font-semibold mb-2">Net Revenue</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Sale:</span><span className="font-semibold">${sd.salePrice.toFixed(2)}</span></div>
            <div className="flex justify-between text-red-600"><span>- Cost:</span><span>-${parseFloat(card.costBasis).toFixed(2)}</span></div>
            <div className="flex justify-between text-red-600"><span>- Fees:</span><span>-${sd.posFees.toFixed(2)}</span></div>
            <div className="flex justify-between pt-2 border-t-2 border-blue-300"><span className="font-bold">Net:</span><span className="font-bold text-lg">${nr.toFixed(2)}</span></div>
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
          <h4 className="font-semibold mb-3">7 Pillars Distribution</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between"><span>Federal (10%):</span><span className="font-semibold">${(nr * 0.10).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>State (10%):</span><span className="font-semibold">${(nr * 0.10).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Charity (10%):</span><span className="font-semibold">${(nr * 0.10).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Player Dev (10%):</span><span className="font-semibold">${(nr * 0.10).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>R&D (20%):</span><span className="font-semibold">${(nr * 0.20).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Operations (20%):</span><span className="font-semibold">${(nr * 0.20).toFixed(2)}</span></div>
            <div className="flex justify-between col-span-2 pt-2 border-t"><span className="font-bold">Profit (20%):</span><span className="font-bold">${(nr * 0.20).toFixed(2)}</span></div>
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={() => onSave(sd)} className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">Complete Sale</button>
        <button onClick={onCancel} className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Cancel</button>
      </div>
    </div>
  );
}
