import { Award, Download, X, Heart, Leaf, Users } from 'lucide-react';

export default function ImpactCertificateModal({ donation, distribution, donorName, onClose }) {
  if (!donation) return null;

  const servings = distribution?.beneficiaryCount || donation.quantity || 10;
  const foodKg = (servings * 0.4).toFixed(1);
  const co2Kg = (servings * 0.4 * 2.5).toFixed(1);
  const certDate = new Date(distribution?.distributedAt || donation.updatedAt || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border relative animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 print:hidden"
        >
          <X size={20} />
        </button>

        {/* Certificate Frame */}
        <div className="border-4 border-double border-primary-600/40 p-8 rounded-2xl bg-gradient-to-b from-white via-primary-50/20 to-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-primary-100 rounded-full opacity-50 blur-xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 bg-emerald-100 rounded-full opacity-50 blur-xl pointer-events-none" />

          {/* Header */}
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 border border-primary-200 shadow-sm">
              <Award size={36} />
            </div>
          </div>
          <span className="text-xs uppercase tracking-widest font-black text-primary-600">
            Food Connect Community Impact
          </span>
          <h2 className="text-3xl font-serif font-bold text-gray-900 mt-1 mb-2">
            Certificate of Recognition
          </h2>
          <p className="text-xs text-gray-500 max-w-md mx-auto mb-6">
            This certificate is gratefully presented in honor of your compassionate donation towards zero hunger and zero food waste.
          </p>

          <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Awarded To</p>
          <h3 className="text-2xl font-bold text-primary-700 font-serif my-1">
            {donorName || donation.donorName || 'Generous Food Donor'}
          </h3>
          <p className="text-xs text-gray-600 max-w-lg mx-auto mb-6 italic">
            For contributing surplus fresh food ("{donation.foodName}") that directly fed families and community members in need.
          </p>

          {/* Impact Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 my-6 max-w-lg mx-auto">
            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
              <Users size={18} className="text-primary-600 mx-auto mb-1" />
              <div className="text-xl font-black text-gray-900">{servings}</div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Meals Served</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
              <Heart size={18} className="text-rose-500 mx-auto mb-1" />
              <div className="text-xl font-black text-gray-900">{foodKg} kg</div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Food Rescued</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
              <Leaf size={18} className="text-emerald-600 mx-auto mb-1" />
              <div className="text-xl font-black text-gray-900">{co2Kg} kg</div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">CO₂e Averted</div>
            </div>
          </div>

          {/* Footer signatures */}
          <div className="flex justify-between items-end border-t border-gray-200/80 pt-6 mt-6 px-4">
            <div className="text-left">
              <p className="text-xs font-bold text-gray-800">{donation.ngoName || 'Partner Charity'}</p>
              <p className="text-[10px] text-gray-400">Distributing NGO Partner</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-800">{certDate}</p>
              <p className="text-[10px] text-gray-400">Date Verified</p>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="flex justify-end gap-3 mt-6 print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Download size={16} />
            Download / Print Certificate
          </button>
        </div>
      </div>
    </div>
  );
}
