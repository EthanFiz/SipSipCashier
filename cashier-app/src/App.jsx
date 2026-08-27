import { useState } from 'react'
import { supabase } from './supabase-client.ts';
import './App.css'

function App() {
  const [counts, setCounts] = useState([0,0,0]);
  const menuItems=["Es Cendol Original", "Es Cendol Spesial", "Es Cendol Premium"];
  const prices=[15000,20000,25000]
  const [paymentImage, setPaymentImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  let price=0

  const min = (index) => {
    setCounts(prevCounts => 
      prevCounts.map((count,i) => (i==index && count>0 ? count-1 : count)));
    };

  const add = (index) => {
    setCounts(prevCounts =>
      prevCounts.map((count,i) => (i==index ? count+1 : count)));
    };
  
  const handleInputChange = (index, value) => {
    const numValue = Number(value) || 0;
    setCounts(prevCounts => 
      prevCounts.map((count,i) => i===index ? numValue : count)
    );
  };

  const handleImageCapture = (e) => {
    const file = e.target.files[0];
    if(file){
      setPaymentImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  for(let i=0; i<counts.length; i++){
    price+=(prices[i]*counts[i]);
  }

  const handleSubmitOrder = async () => {
    // Basic validation
    if (price === 0) {
      alert("Please select at least one item!");
      return;
    }

    const needsProof = paymentMethod === 'QRIS' || paymentMethod === 'Bank Transfer';
    if (needsProof && !paymentImage) {
      alert("Please upload payment proof for digital payments!");
      return;
    }

    setIsSubmitting(true);

    try {
      let publicImageUrl = null;

      // 1. Upload payment image to Supabase Bucket if available
      if (paymentImage) {
        const fileExt = paymentImage.name.split('.').pop();
        const fileName = `proof_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('Payment Proofs') // Your bucket name in Supabase Storage
          .upload(fileName, paymentImage);

        if (uploadError) throw uploadError;

        // Get public download link
        const { data: urlData } = supabase.storage
          .from('Payment Proofs')
          .getPublicUrl(fileName);

        publicImageUrl = urlData.publicUrl;
      }

      // 2. Insert row into Supabase database table
      const { error: insertError } = await supabase
        .from('Order Sip Sip') // Your table name in Supabase Database
        .insert([
          {
            Original: counts[0],
            Special: counts[1],
            Premium: counts[2],
            Total: price,
            Metode_Pembayaran: paymentMethod,
            Bukti_Pembayaran: publicImageUrl
            // id & created_at fill automatically in Supabase
          }
        ]);

      if (insertError) throw insertError;

      alert("Order saved successfully!");

      // 3. Reset state for next transaction
      setCounts([0, 0, 0]);
      setPaymentImage(null);
      setImagePreview(null);
      setPaymentMethod("Cash");

    } catch (err) {
      console.error("Submission failed:", err.message);
      alert("Failed to save order: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <h1>Sip Sip Cashier</h1>
      <div className="card">
        <div className="items">
        <h3>New Order</h3>
          {menuItems.map((itemName,index) => (
            <div className="cendol" key={index}>
              <p>{itemName}</p>
              <div className="buttonGroup">
                <button class="button min" type="button" onClick={() => min(index)}>-</button>
                <input 
                  type="text" 
                  id="ammount" 
                  class="button"
                  value={counts[index]}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                />
                <button class="button add" type="button" onClick={() => add(index)}>+</button>
              </div>
            </div>
          ))}
          <h2>Total: Rp. {price}</h2>
          <h3>Pembayaran</h3>
          <div className="cendol">
            <p>Metode Pembayaran:</p>
            <select id="metodeBayar" onChange={(e) => setPaymentMethod(e.target.value)}>
              <option>Cash</option>
              <option>Coupon</option>
              <option>QRIS</option>
              <option>Bank Transfer</option>
            </select>
          </div>
          <div id="addFoto" class={(paymentMethod == 'QRIS' || paymentMethod == 'Bank Transfer') ? '' : 'hidden'}>
              <p><b>Upload Bukti Bayar</b></p>
            {imagePreview && (
              <div style={{ marginTop: '10px' }}>
                <p>Preview:</p>
                <img 
                  src={imagePreview} 
                  alt="Payment Proof Preview" 
                  style={{ width: '200px', borderRadius: '8px' }} 
                />
              </div>
            )}
            <input id="inputImage" type="file" accept="image/*" capture="environment" onChange={handleImageCapture}/>
          </div>
          <button 
            type="button"
            onClick={handleSubmitOrder}
            disabled={isSubmitting}
            style={{ marginTop: '20px', width: '100%', padding: '12px' }}
          >
            {isSubmitting ? 'Processing...' : 'Submit Order'}
          </button>
        </div>
      </div>
    </>
  )
}

export default App
