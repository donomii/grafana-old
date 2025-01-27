import { merge } from 'lodash';
import { getFieldDisplayValues, GetFieldDisplayValuesOptions } from './fieldDisplay';
import { toDataFrame } from '../dataframe/processDataFrame';
import { ReducerID } from '../transformations/fieldReducer';
import { MappingType, SpecialValueMatch, ValueMapping } from '../types';
import { standardFieldConfigEditorRegistry } from './standardFieldConfigEditorRegistry';
import { createTheme } from '../themes';

describe('FieldDisplay', () => {
  beforeAll(() => {
    // Since FieldConfigEditors belong to grafana-ui we need to mock those here
    // as grafana-ui code cannot be imported in grafana-data.
    // TODO: figure out a way to share standard editors between data/ui tests
    const mappings = {
      id: 'mappings', // Match field properties
      process: (value: any) => value,
      shouldApply: () => true,
    } as any;

    standardFieldConfigEditorRegistry.setInit(() => {
      return [mappings];
    });
  });

  it('show first numeric values', () => {
    const options = createDisplayOptions({
      reduceOptions: {
        calcs: [ReducerID.first],
      },
      fieldConfig: {
        overrides: [],
        defaults: {
          displayName: '$__cell_0 * $__field_name * $__series_name',
        },
      },
    });
    const display = getFieldDisplayValues(options);
    expect(display.map((v) => v.display.text)).toEqual(['1', '2']);
  });

  it('show last numeric values', () => {
    const options = createDisplayOptions({
      reduceOptions: {
        calcs: [ReducerID.last],
      },
    });
    const display = getFieldDisplayValues(options);
    expect(display.map((v) => v.display.numeric)).toEqual([5, 6]);
  });

  it('show all numeric values', () => {
    const options = createDisplayOptions({
      reduceOptions: {
        values: true, //
        limit: 1000,
        calcs: [],
      },
    });
    const display = getFieldDisplayValues(options);
    expect(display.map((v) => v.display.numeric)).toEqual([1, 3, 5, 2, 4, 6]);
  });

  it('show 2 numeric values (limit)', () => {
    const options = createDisplayOptions({
      reduceOptions: {
        values: true, //
        limit: 2,
        calcs: [],
      },
    });
    const display = getFieldDisplayValues(options);
    expect(display.map((v) => v.display.numeric)).toEqual([1, 3]); // First 2 are from the first field
  });

  it('Should return field thresholds when there is no data', () => {
    const options = createEmptyDisplayOptions({
      fieldConfig: {
        defaults: {
          thresholds: { steps: [{ color: '#F2495C', value: 50 }] },
        },
      },
    });

    const display = getFieldDisplayValues(options);
    expect(display[0].field.thresholds!.steps!.length).toEqual(1);
    expect(display[0].display.numeric).toEqual(0);
  });

  it('Should return field with default text when no mapping or data available', () => {
    const options = createEmptyDisplayOptions();
    const display = getFieldDisplayValues(options);
    expect(display[0].display.text).toEqual('No data');
    expect(display[0].display.numeric).toEqual(0);
  });

  it('Should return field mapped value when there is no data', () => {
    const mapEmptyToText = '0';
    const options = createEmptyDisplayOptions({
      fieldConfig: {
        defaults: {
          mappings: [
            {
              type: MappingType.SpecialValue,
              options: {
                match: SpecialValueMatch.Null,
                result: { text: mapEmptyToText },
              },
            },
          ],
        },
      },
    });

    const display = getFieldDisplayValues(options);
    expect(display[0].display.text).toEqual(mapEmptyToText);
    expect(display[0].display.numeric).toEqual(0);
  });

  it('Should always return display numeric 0 when there is no data', () => {
    const mapEmptyToText = '0';
    const options = createEmptyDisplayOptions({
      fieldConfig: {
        overrides: {
          mappings: [
            {
              type: MappingType.SpecialValue,
              options: {
                match: SpecialValueMatch.Null,
                result: { text: mapEmptyToText },
              },
            },
          ],
        },
      },
    });

    const display = getFieldDisplayValues(options);
    expect(display[0].display.numeric).toEqual(0);
  });

  it('Should always return defaults with min/max 0 when there is no data', () => {
    const options = createEmptyDisplayOptions({
      fieldConfig: {
        defaults: {},
      },
    });

    const display = getFieldDisplayValues(options);
    expect(display[0].field.min).toEqual(0);
    expect(display[0].field.max).toEqual(0);
  });

  describe('Value mapping', () => {
    it('should apply value mapping', () => {
      const mappingConfig: ValueMapping[] = [
        {
          type: MappingType.ValueToText,
          options: {
            '1': { text: 'Value mapped to text' },
          },
        },
      ];
      const options = createDisplayOptions({
        reduceOptions: {
          calcs: [ReducerID.first],
        },
      });

      options.data![0].fields[1]!.config = { mappings: mappingConfig };
      options.data![0].fields[2]!.config = { mappings: mappingConfig };

      const result = getFieldDisplayValues(options);
      expect(result[0].display.text).toEqual('Value mapped to text');
    });

    it('should apply range value mapping', () => {
      const mappedValue = 'Range mapped to text';
      const mappingConfig: ValueMapping[] = [
        {
          type: MappingType.RangeToText,
          options: {
            from: 1,
            to: 3,
            result: { text: mappedValue },
          },
        },
      ];
      const options = createDisplayOptions({
        reduceOptions: {
          calcs: [ReducerID.first],
          values: true,
        },
      });

      options.data![0].fields[1]!.config = { mappings: mappingConfig };
      options.data![0].fields[2]!.config = { mappings: mappingConfig };

      const result = getFieldDisplayValues(options);

      expect(result[0].display.text).toEqual(mappedValue);
      expect(result[2].display.text).toEqual('5');
      expect(result[3].display.text).toEqual(mappedValue);
    });
  });

  describe('auto option', () => {
    it('No string fields, single value', () => {
      const options = createDisplayOptions({
        reduceOptions: {
          values: true,
          calcs: [],
        },
        data: [
          toDataFrame({
            name: 'Series Name',
            fields: [{ name: 'A', values: [10] }],
          }),
        ],
      });

      const result = getFieldDisplayValues(options);
      expect(result[0].display.title).toEqual('A');
      expect(result[0].display.text).toEqual('10');
    });

    it('Single other string field', () => {
      const options = createDisplayOptions({
        reduceOptions: {
          values: true,
          calcs: [],
        },
        data: [
          toDataFrame({
            fields: [
              { name: 'Name', values: ['A', 'B'] },
              { name: 'Value', values: [10, 20] },
            ],
          }),
        ],
      });

      const result = getFieldDisplayValues(options);
      expect(result[0].display.title).toEqual('A');
      expect(result[0].display.text).toEqual('10');
      expect(result[1].display.title).toEqual('B');
      expect(result[1].display.text).toEqual('20');
    });

    it('Single string field multiple value fields', () => {
      const options = createDisplayOptions({
        reduceOptions: {
          values: true,
          calcs: [],
        },
        data: [
          toDataFrame({
            fields: [
              { name: 'Name', values: ['A', 'B'] },
              { name: 'SensorA', values: [10, 20] },
              { name: 'SensorB', values: [10, 20] },
            ],
          }),
        ],
      });

      const result = getFieldDisplayValues(options);
      expect(result[0].display.title).toEqual('A SensorA');
      expect(result[0].display.text).toEqual('10');
      expect(result[1].display.title).toEqual('B SensorA');
      expect(result[1].display.text).toEqual('20');
      expect(result[2].display.title).toEqual('A SensorB');
      expect(result[3].display.title).toEqual('B SensorB');
    });

    it('Multiple other string fields', () => {
      const options = createDisplayOptions({
        reduceOptions: {
          values: true,
          calcs: [],
        },
        data: [
          toDataFrame({
            fields: [
              { name: 'Country', values: ['Sweden', 'Norway'] },
              { name: 'City', values: ['Stockholm', 'Oslo'] },
              { name: 'Value', values: [10, 20] },
            ],
          }),
        ],
      });

      const result = getFieldDisplayValues(options);
      expect(result[0].display.title).toEqual('Sweden Stockholm');
      expect(result[0].display.text).toEqual('10');
      expect(result[1].display.title).toEqual('Norway Oslo');
      expect(result[1].display.text).toEqual('20');
    });
  });
});

function createEmptyDisplayOptions(extend = {}): GetFieldDisplayValuesOptions {
  const options = createDisplayOptions(extend);

  return Object.assign(options, {
    data: [
      {
        name: 'No data',
        fields: [],
        length: 0,
      },
    ],
  });
}

function createDisplayOptions(extend: Partial<GetFieldDisplayValuesOptions> = {}): GetFieldDisplayValuesOptions {
  const options: GetFieldDisplayValuesOptions = {
    data: [
      toDataFrame({
        name: 'Series Name',
        fields: [
          { name: 'Field 1', values: ['a', 'b', 'c'] },
          { name: 'Field 2', values: [1, 3, 5] },
          { name: 'Field 3', values: [2, 4, 6] },
        ],
      }),
    ],
    replaceVariables: (value: string) => {
      return value;
    },
    reduceOptions: {
      calcs: [],
    },
    fieldConfig: {
      overrides: [],
      defaults: {},
    },
    theme: createTheme(),
  };

  return merge<GetFieldDisplayValuesOptions, any>(options, extend);
}
