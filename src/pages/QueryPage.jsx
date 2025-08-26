import { useSearchParams } from 'react-router-dom';
import { PageContainer, PageHeader } from '../components/layouts';
import QueryForm from '../components/query/QueryForm';
import QueryResults from '../components/query/QueryResults';
import { useQuery } from '../hooks/useQuery';

export default function QueryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    queryType,
    setQueryType,
    formData,
    setFormData,
    results,
    loading,
    error,
    executeQuery,
    clearQuery,
  } = useQuery(searchParams, setSearchParams);

  return (
    <PageContainer>
      <PageHeader
        title="Query System"
        description="Search and filter your flip data with custom criteria"
        icon="🔍"
      />

      <QueryForm
        queryType={queryType}
        onQueryTypeChange={setQueryType}
        formData={formData}
        onFormDataChange={setFormData}
        onExecuteQuery={executeQuery}
        onClearQuery={clearQuery}
        loading={loading}
      />

      {error && (
        <div className="mt-4 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {results && !error && (
        <QueryResults queryType={queryType} results={results} loading={loading} />
      )}
    </PageContainer>
  );
}
