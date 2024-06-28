import { describe, expect, test } from '@jest/globals';
import { bigNumberToWrappedI80F48, wrappedI80F48toBigNumber } from './conversion';
import BigNumber from 'bignumber.js';

declare global {
  namespace jest {
      interface Matchers<R> {
        toBeCloseToBigNumber(received: BigNumber, expected: BigNumber, precision?: BigNumber): CustomMatcherResult;
      }
  }
}

expect.extend({
  toBeCloseToBigNumber(received: BigNumber, expected: BigNumber, precisionDecimals: number = 6) {
    const pass = received.minus(expected).abs().lte(new BigNumber(10).pow(-precisionDecimals));
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be close to ${expected} within ${precisionDecimals} decimal places`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be close to ${expected} within ${precisionDecimals} decimal places`,
        pass: false,
      };
    }
  },
});

describe('conversions', () => {
  test('wrappedI80F48 -> bignumber conversions', () => {
    for (const testCase of testCases) {
      //@ts-ignore
      expect(wrappedI80F48toBigNumber({ value: testCase.innerValue })).toBeCloseToBigNumber(new BigNumber(testCase.number));
    }
  });

  test('bignumber conversions -> wrappedI80F48', () => {
    for (const testCase of testCases) {
      //@ts-ignore
      expect(wrappedI80F48toBigNumber((bigNumberToWrappedI80F48(testCase.number)))).toBeCloseToBigNumber(new BigNumber(testCase.number));
    }
  });
});

const testCases = [
  { number: 333177.604135, innerValue: [116, 94, 99, 151, 168, 154, 121, 21, 5, 0, 0, 0, 0, 0, 0, 0] },
  { number: -320024.31329, innerValue: [15, 214, 255, 57, 204, 175, 231, 29, 251, 255, 255, 255, 255, 255, 255, 255] },
  { number: -184964.817127999999997, innerValue: [168, 90, 11, 179, 208, 46, 123, 45, 253, 255, 255, 255, 255, 255, 255, 255] },
  { number: 145880.413458, innerValue: [2, 69, 44, 98, 216, 105, 216, 57, 2, 0, 0, 0, 0, 0, 0, 0] },
  { number: -521159.011153999999998, innerValue: [202, 199, 238, 2, 37, 253, 56, 12, 248, 255, 255, 255, 255, 255, 255, 255] },
  { number: 306095.33728, innerValue: [74, 152, 105, 251, 87, 86, 175, 171, 4, 0, 0, 0, 0, 0, 0, 0] },
  { number: 468973.894675, innerValue: [126, 140, 185, 107, 9, 229, 237, 39, 7, 0, 0, 0, 0, 0, 0, 0] },
  { number: -444735.09754, innerValue: [187, 242, 89, 158, 7, 231, 192, 54, 249, 255, 255, 255, 255, 255, 255, 255] },
  { number: -799550.786074, innerValue: [156, 195, 181, 218, 195, 54, 193, 204, 243, 255, 255, 255, 255, 255, 255, 255] },
  { number: 913867.920565, innerValue: [157, 215, 216, 37, 170, 235, 203, 241, 13, 0, 0, 0, 0, 0, 0, 0] },
  { number: 212757.443621999999998, innerValue: [62, 201, 29, 54, 145, 113, 21, 63, 3, 0, 0, 0, 0, 0, 0, 0] },
  { number: -603463.9166, innerValue: [133, 124, 208, 179, 89, 21, 184, 202, 246, 255, 255, 255, 255, 255, 255, 255] },
  { number: -992610.076007999999998, innerValue: [1, 196, 93, 189, 138, 236, 157, 218, 240, 255, 255, 255, 255, 255, 255, 255] },
  { number: 659149.559504999999998, innerValue: [207, 242, 60, 184, 59, 143, 205, 14, 10, 0, 0, 0, 0, 0, 0, 0] },
  { number: -707863.153444999999998, innerValue: [234, 67, 23, 212, 183, 216, 232, 50, 245, 255, 255, 255, 255, 255, 255, 255] },
  { number: -332923.252035, innerValue: [122, 141, 93, 162, 122, 191, 132, 235, 250, 255, 255, 255, 255, 255, 255, 255] },
  { number: 567806.021576999999997, innerValue: [133, 88, 253, 17, 134, 5, 254, 169, 8, 0, 0, 0, 0, 0, 0, 0] },
  { number: 72780.647166, innerValue: [72, 21, 197, 171, 172, 165, 76, 28, 1, 0, 0, 0, 0, 0, 0, 0] },
  { number: 96319.129689999999997, innerValue: [68, 158, 36, 93, 51, 33, 63, 120, 1, 0, 0, 0, 0, 0, 0, 0] },
  { number: 235165.397298, innerValue: [38, 196, 92, 82, 181, 101, 157, 150, 3, 0, 0, 0, 0, 0, 0, 0] },
  { number: 613590.861196, innerValue: [46, 114, 79, 87, 119, 220, 214, 92, 9, 0, 0, 0, 0, 0, 0, 0] },
  { number: -811566.9778, innerValue: [161, 248, 49, 230, 174, 5, 209, 157, 243, 255, 255, 255, 255, 255, 255, 255] },
  { number: 453684.362554, innerValue: [179, 8, 197, 86, 208, 92, 52, 236, 6, 0, 0, 0, 0, 0, 0, 0] },
  { number: 576146.440447, innerValue: [14, 159, 116, 34, 193, 112, 146, 202, 8, 0, 0, 0, 0, 0, 0, 0] },
  { number: -468496.525827999999997, innerValue: [206, 173, 16, 86, 99, 121, 239, 217, 248, 255, 255, 255, 255, 255, 255, 255] },
  { number: 50325.08672, innerValue: [188, 232, 43, 72, 51, 22, 149, 196, 0, 0, 0, 0, 0, 0, 0, 0] },
  { number: -918928.407248, innerValue: [123, 163, 86, 152, 190, 151, 111, 250, 241, 255, 255, 255, 255, 255, 255, 255] },
  { number: 475199.865609999999997, innerValue: [46, 23, 241, 157, 152, 221, 63, 64, 7, 0, 0, 0, 0, 0, 0, 0] },
  { number: 900445.00986, innerValue: [223, 137, 89, 47, 134, 2, 93, 189, 13, 0, 0, 0, 0, 0, 0, 0] },
  { number: -643688.505103, innerValue: [118, 227, 221, 145, 177, 126, 151, 45, 246, 255, 255, 255, 255, 255, 255, 255] },
  { number: 0, innerValue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { number: 1, innerValue: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { number: -1, innerValue: [0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255] },
  { number: 0.328934, innerValue: [223, 138, 196, 4, 53, 84, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { number: 423947246342.48699951171875, innerValue: [0, 0, 0, 0, 172, 124, 6, 155, 57, 181, 98, 0, 0, 0, 0, 0] },
  { number: 1783921462347640, innerValue: [0, 0, 0, 0, 0, 0, 120, 7, 18, 149, 119, 86, 6, 0, 0, 0] },
  { number: 0.00000000000232, innerValue: [141, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
];
