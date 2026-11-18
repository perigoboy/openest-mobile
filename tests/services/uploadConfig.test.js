import { multipartUploadConfig } from "../../src/services/uploadConfig";

describe("multipartUploadConfig", () => {
  it("remove o Content-Type para o RN gerar o boundary (corrige o 400)", () => {
    const cfg = multipartUploadConfig();
    const headers = { "Content-Type": "application/json", delete: jest.fn() };
    const data = { fake: "formdata" };
    const out = cfg.transformRequest(data, headers);
    expect(out).toBe(data); // não serializa o FormData
    expect(headers.delete).toHaveBeenCalledWith("Content-Type");
    expect(headers["Content-Type"]).toBeUndefined();
    expect(cfg.timeout).toBe(60000);
  });
  it("funciona com headers simples (sem AxiosHeaders.delete)", () => {
    const cfg = multipartUploadConfig();
    const headers = { "content-type": "application/json" };
    cfg.transformRequest({}, headers);
    expect(headers["content-type"]).toBeUndefined();
  });
});
