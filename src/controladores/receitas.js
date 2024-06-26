const knex = require('../conexao');

const receitas = async (req, res) => {
    const { id } = req.usuario
    const { receita } = req.query


    try {
        if (receita) {
            const buscarReceita = await knex('receitas').where({ nome: receita, usuario_id: id }).first()
            if (!buscarReceita) {
                return res.status(404).json({ mensagem: 'Receita não encontrado' })
            }
            const buscarInsumos = await knex('insumo_receita').where({ receita_id: buscarReceita.id, usuario_id: id })
            const buscarPreparos = await knex('preparo_receita').where({ receita_id: buscarReceita.id, usuario_id: id })
            const preparoFormatado = []
            const insumoFormatado = []
            let valorUtilizado = 0

            for (let insumo of buscarInsumos) {
                const insumos = await knex('insumos').where({ id: insumo.insumo_id, usuario_id: id }).first()
                const formatarInsumos = {
                    insumo: insumos.nome,
                    valor_utilizado: `R$${((insumos.valor / insumos.peso) * insumo.peso_utilizado / 100).toFixed(2)}`
                }

                insumoFormatado.push(formatarInsumos)
                valorUtilizado += (insumos.valor / insumos.peso) * insumo.peso_utilizado
            }

            for (let preparo of buscarPreparos) {
                const preparos = await knex('preparos').where({ id: preparo.preparo_id, usuario_id: id }).first()
                const preparoReceita = await knex('preparo_receita')
                    .where({ usuario_id: id, preparo_id: preparos.id, receita_id: buscarReceita.id })
                    .first()
                const buscarInsumosDoPreparo = await knex('insumo_preparo').where({ preparo_id: preparos.id, usuario_id: id })
                let valorUtilizadoDoPreparo = 0
                const insumoParaOPreparo = []
                for (let insumo of buscarInsumosDoPreparo) {
                    const insumos = await knex('insumos').where({ id: insumo.insumo_id, usuario_id: id }).first()
                    valorUtilizadoDoPreparo += ((insumos.valor / insumos.peso) * insumo.peso_utilizado)
                    const formatarInsumos = {
                        insumo: insumos.nome,
                        valor_utilizado: `R$${((insumos.valor / insumos.peso) * insumo.peso_utilizado / 100).toFixed(2)}`
                    }

                    insumoParaOPreparo.push(formatarInsumos)
                }
                const formatarPreparos = {
                    preparo: preparos.nome,
                    valor_utilizado: `R$${((valorUtilizadoDoPreparo / preparos.peso) * preparoReceita.peso_utilizado / 100).toFixed(2)}`,
                    insumos: insumoParaOPreparo
                }

                preparoFormatado.push(formatarPreparos)
                valorUtilizado += (valorUtilizadoDoPreparo / preparos.peso) * preparoReceita.peso_utilizado
            }
            const gastosIncalculaveis = valorUtilizado + (valorUtilizado) / 4
            return res.json({
                receita: buscarReceita.nome,
                valotTotalDaReceita: `R$${(valorUtilizado / 100).toFixed(2)}`,
                valorMaisGastosIncalculaveis: `R$${(gastosIncalculaveis / 100).toFixed(2)}`,
                insumos: insumoFormatado,
                preparos: preparoFormatado
            })
        }




        const resultado = await knex('receitas').where({ usuario_id: id })
        return res.status(200).json(resultado)

    } catch (error) {
        return res.status(500).json({ mensagem: 'Erro interno do servidor' })

    }
}
const adicionarInsumoAReceita = async (req, res) => {
    const { peso, receita, insumo } = req.body
    const { id } = req.usuario
    try {
        const buscarReceita = await knex('receitas').where({ nome: receita, usuario_id: id }).first()
        if (!buscarReceita) {
            return res.status(404).json({ mensagem: 'Receita não encontrada' })
        }
        const buscarInsumo = await knex('insumos').where({ nome: insumo, usuario_id: id }).first()
        if (!buscarInsumo) {
            return res.status(404).json({ mensagem: 'Insumo não encontrado' })
        }

        const buscar = await knex('insumo_receita').where({
            usuario_id: id,
            receita_id: buscarReceita.id,
            insumo_id: buscarInsumo.id
        }).first()

        if (buscar) {
            return res.status(400).json({ mensagem: 'Insumo já cadastrado para essa receita!' })
        }


        const adicionar = await knex('insumo_receita').insert({
            receita_id: buscarReceita.id,
            insumo_id: buscarInsumo.id,
            usuario_id: id,
            peso_utilizado: peso,
        }).returning(['*'])

        res.status(201).json(adicionar)
    } catch (error) {
        res.status(500).json({ mensagem: 'Erro interno do servidor' })

    }
}

const adicionarPreparoAReceita = async (req, res) => {
    const { peso, receita, preparo } = req.body
    const { id } = req.usuario
    try {
        const buscarReceita = await knex('receitas').where({ nome: receita, usuario_id: id }).first()
        if (!buscarReceita) {
            return res.status(404).json({ mensagem: 'Receita não encontrada' })
        }
        const buscarPreparo = await knex('preparos').where({ nome: preparo, usuario_id: id }).first()
        if (!buscarPreparo) {
            return res.status(404).json({ mensagem: 'Preparo não encontrado' })
        }

        const buscar = await knex('preparo_receita').where({
            usuario_id: id,
            receita_id: buscarReceita.id,
            preparo_id: buscarPreparo.id
        }).first()

        if (buscar) {
            return res.status(400).json({ mensagem: 'Preparo já cadastrado para essa receita!' })
        }


        const adicionar = await knex('preparo_receita').insert({
            receita_id: buscarReceita.id,
            preparo_id: buscarPreparo.id,
            usuario_id: id,
            peso_utilizado: peso,
        }).returning(['*'])

        res.status(201).json(adicionar)
    } catch (error) {
        res.status(500).json({ mensagem: 'Erro interno do servidor' })

    }
}



const cadastrarReceitas = async (req, res) => {
    const { nome } = req.body
    const { id } = req.usuario
    try {
        const buscarReceita = await knex('receitas').where({ nome, usuario_id: id }).first()
        if (buscarReceita) {
            return res.status(400).json({ mensagem: 'Receita ja cadastrada' })
        }

        const adicionarReceita = await knex('receitas').insert({ nome, usuario_id: id }).returning(['*'])
        return res.status(201).json(adicionarReceita)
    } catch (error) {
        return res.status(500).json({ mensagem: 'Erro interno do servidor' })
    }
}

const atualizarReceita = async (req, res) => {
    const { idReceita } = req.params
    const { id } = req.usuario
    const { nome } = req.body

    if (!nome) {
        return res.status(400).json({ mensagem: 'Precisa informar o nome da receita para atualizar' })
    }

    try {
        const buscarReceita = await knex('receitas').where({ id: idReceita, usuario_id: id }).first()
        if (!buscarReceita) {
            return res.status(404).json({ mensagem: 'Receita não encontrada' })

        }
        const validarNome = await knex('receitas').where({ nome, usuario_id: id }).first()
        if (validarNome && buscarReceita.nome !== validarNome.nome) {
            return res.status(400).json({ mensagem: 'Receita já cadastrada' })
        }
        const alterarReceita = await knex('receitas').update({ nome }).where({ id: idReceita, usuario_id: id }).returning(['*'])
        return res.status(200).json({
            mensagem: 'Receita atualizado com sucesso',
            receita: alterarReceita[0]
        })
    } catch (error) {
        return res.status(500).json({ mensagem: 'Erro interno do servidor' })

    }
}


const deletarReceita = async (req, res) => {
    const { idReceita } = req.params
    const { id } = req.usuario

    try {
        const buscarEmInsumos = await knex('insumo_receita').where({ receita_id: idReceita }).first()
        const buscarEmPreparos = await knex('preparo_receita').where({ receita_id: idReceita }).first()

        if (buscarEmPreparos) {
            return res.status(400).json({ mensagem: "Não pode deletar receita com preparo cadastrado" })
        }
        if (buscarEmInsumos) {
            return res.status(400).json({ mensagem: "Não pode deletar receita com insumo cadastrado" })
        }

        const deletar = await knex('receitas').delete().where({ id: idReceita, usuario_id: id })

        if (deletar === 0) {
            return res.status(404).json({ mensagem: 'Receita não encontrada' })
        }
        if (deletar === 1) {
            return res.status(200).json({ mensagem: 'Deletado com sucesso' })
        }

    } catch (error) {
        return res.status(500).json({ mensagem: 'Erro interno do servidor' })
    }
}





module.exports = {
    cadastrarReceitas,
    receitas,
    atualizarReceita,
    deletarReceita,
    adicionarInsumoAReceita,
    adicionarPreparoAReceita
}