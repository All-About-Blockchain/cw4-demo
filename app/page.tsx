import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-100">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          CW4 Governance
        </h1>
        <p className="text-gray-600 mb-8">
          A governance frontend for CW3/CW4 contracts on Juno
        </p>

        <div className="space-y-4">
          <Link
            href="/signup"
            className="block w-full px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            Join Governance
          </Link>

          <Link
            href="/governance"
            className="block w-full px-6 py-3 rounded-xl bg-gray-600 text-white font-semibold hover:bg-gray-700 transition"
          >
            View Proposals
          </Link>
        </div>
      </div>
    </div>
  );
}
