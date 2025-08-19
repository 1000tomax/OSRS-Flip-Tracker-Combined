import React from 'react';

export default function TestRoute() {
  React.useEffect(() => {
    console.log('TestRoute component mounted!');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white p-8">
      <h1 className="text-4xl font-bold">Test Route Works!</h1>
      <p className="mt-4">If you can see this, routing is working.</p>
    </div>
  );
}
