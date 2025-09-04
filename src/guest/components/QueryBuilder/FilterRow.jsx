import { getAvailableFields, getOperatorsForField } from '../../utils/queryExecutor';

export function FilterRow({ filter, onChange, onRemove }) {
  const availableFields = getAvailableFields();
  const currentField = availableFields.find(f => f.name === filter.field);
  const fieldType = currentField?.type || 'string';
  const operators = getOperatorsForField(fieldType);
  
  const handleFieldChange = (field) => {
    const newField = availableFields.find(f => f.name === field);
    const newFieldType = newField?.type || 'string';
    const newOperators = getOperatorsForField(newFieldType);
    
    // Reset operator if not compatible with new field type
    const operatorStillValid = newOperators.some(op => op.value === filter.operator);
    
    onChange({
      ...filter,
      field,
      operator: operatorStillValid ? filter.operator : newOperators[0].value,
      value: newFieldType === 'number' ? 0 : '',
      value2: undefined
    });
  };
  
  const handleOperatorChange = (operator) => {
    onChange({
      ...filter,
      operator,
      // Reset value2 if not needed
      value2: operator === 'between' ? filter.value2 || '' : undefined
    });
  };
  
  const handleValueChange = (value) => {
    // Convert to number if field is numeric
    const processedValue = fieldType === 'number' ? parseFloat(value) || 0 : value;
    onChange({
      ...filter,
      value: processedValue
    });
  };
  
  const handleValue2Change = (value2) => {
    const processedValue = fieldType === 'number' ? parseFloat(value2) || 0 : value2;
    onChange({
      ...filter,
      value2: processedValue
    });
  };
  
  return (
    <div className="flex gap-2 items-center">
      {/* Field Selector */}
      <select
        value={filter.field || ''}
        onChange={(e) => handleFieldChange(e.target.value)}
        className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
      >
        <option value="">Select field...</option>
        {availableFields.map(field => (
          <option key={field.name} value={field.name}>
            {field.label}
            {field.computed && ' ⚡'}
          </option>
        ))}
      </select>
      
      {/* Operator Selector */}
      <select
        value={filter.operator || ''}
        onChange={(e) => handleOperatorChange(e.target.value)}
        className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        disabled={!filter.field}
      >
        <option value="">Select operator...</option>
        {operators.map(op => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>
      
      {/* Value Input */}
      {fieldType === 'date' ? (
        <input
          type="date"
          value={filter.value || ''}
          onChange={(e) => handleValueChange(e.target.value)}
          className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          disabled={!filter.field || !filter.operator}
        />
      ) : fieldType === 'number' ? (
        <input
          type="number"
          value={filter.value || ''}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder="Value"
          className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none w-32"
          disabled={!filter.field || !filter.operator}
        />
      ) : (
        <input
          type="text"
          value={filter.value || ''}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder="Value"
          className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          disabled={!filter.field || !filter.operator}
        />
      )}
      
      {/* Second value for 'between' operator */}
      {filter.operator === 'between' && (
        <>
          <span className="text-gray-400">and</span>
          {fieldType === 'date' ? (
            <input
              type="date"
              value={filter.value2 || ''}
              onChange={(e) => handleValue2Change(e.target.value)}
              className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          ) : fieldType === 'number' ? (
            <input
              type="number"
              value={filter.value2 || ''}
              onChange={(e) => handleValue2Change(e.target.value)}
              placeholder="Max value"
              className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none w-32"
            />
          ) : (
            <input
              type="text"
              value={filter.value2 || ''}
              onChange={(e) => handleValue2Change(e.target.value)}
              placeholder="Max value"
              className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          )}
        </>
      )}
      
      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        title="Remove filter"
      >
        ✕
      </button>
    </div>
  );
}